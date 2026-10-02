import type { HeapOperationPhase, HeapOpStep, HeapOpType } from "../types";

/**
 * Generic array-backed binary max-heap.
 *
 * Why a heap and not `array.sort()` on every change?
 * - Insertion:      O(log n)   (sift-up along one root-to-leaf path)
 * - Extract-max:     O(log n)   (sift-down along one root-to-leaf path)
 * - Peek:            O(1)
 * - Re-sort array:   O(n log n) every single time something changes
 *
 * A hospital queue is mutated constantly (new arrivals, aging ticks,
 * escalations, discharges). Re-sorting the whole list on every mutation
 * is wasteful and does not reflect how a real scheduler would be built.
 * The heap keeps the single most urgent patient trivially accessible
 * while keeping every mutation cheap.
 *
 * Every mutating method records a step-by-step operation log (compares,
 * swaps, and a snapshot of heap order after each step) tagged with a
 * `phase` supplied by the caller. This is what the Heap Operation Stepper
 * replays — the heap has no idea a UI exists, it just keeps an honest
 * record of what it actually did.
 */
export class MaxHeap<T> {
  private items: T[] = [];
  private readonly compare: (a: T, b: T) => number;
  private readonly keyOf: (item: T) => string;
  private readonly idOf: (item: T) => string;
  private currentPhase: HeapOperationPhase = "rescore-manual";
  public lastOps: HeapOpStep[] = [];

  constructor(compare: (a: T, b: T) => number, keyOf: (item: T) => string, idOf?: (item: T) => string) {
    this.compare = compare;
    this.keyOf = keyOf;
    this.idOf = idOf ?? keyOf;
  }

  get size(): number {
    return this.items.length;
  }

  toArray(): T[] {
    return [...this.items];
  }

  peek(): T | undefined {
    return this.items[0];
  }

  private parentIdx(i: number) {
    return Math.floor((i - 1) / 2);
  }
  private leftIdx(i: number) {
    return i * 2 + 1;
  }
  private rightIdx(i: number) {
    return i * 2 + 2;
  }

  private pushOp(type: HeapOpType, indices: number[], note: string) {
    this.lastOps.push({
      type,
      indices,
      note,
      phase: this.currentPhase,
      snapshot: this.items.map(this.idOf),
    });
  }

  private swap(i: number, j: number, note: string) {
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
    this.pushOp("swap", [i, j], note);
  }

  insert(item: T): HeapOpStep[] {
    this.lastOps = [];
    this.currentPhase = "insert";
    this.items.push(item);
    this.pushOp(
      "set-root",
      [this.items.length - 1],
      `Inserted ${this.keyOf(item)} at the next free leaf (index ${this.items.length - 1}).`
    );
    this.currentPhase = "heapify-up";
    this.siftUp(this.items.length - 1);
    return this.lastOps;
  }

  private siftUp(startIdx: number) {
    let idx = startIdx;
    while (idx > 0) {
      const parent = this.parentIdx(idx);
      this.pushOp(
        "compare",
        [idx, parent],
        `Comparing ${this.keyOf(this.items[idx])} with parent ${this.keyOf(this.items[parent])}.`
      );
      if (this.compare(this.items[idx], this.items[parent]) > 0) {
        this.swap(
          idx,
          parent,
          `${this.keyOf(this.items[idx])} has higher priority than its parent ${this.keyOf(
            this.items[parent]
          )}. Therefore they swap, and the heap property is restored upward.`
        );
        idx = parent;
      } else {
        break;
      }
    }
  }

  extractMax(): T | undefined {
    this.lastOps = [];
    this.currentPhase = "extract-max";
    if (this.items.length === 0) return undefined;
    const max = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.pushOp("set-root", [0], `Removed root ${this.keyOf(max)}. Moved last leaf (${this.keyOf(last)}) to the root.`);
      this.currentPhase = "heapify-down";
      this.siftDown(0);
    } else {
      this.pushOp("set-root", [], `Removed root ${this.keyOf(max)}. Heap is now empty.`);
    }
    return max;
  }

  private siftDown(startIdx: number) {
    let idx = startIdx;
    const n = this.items.length;
    while (true) {
      const left = this.leftIdx(idx);
      const right = this.rightIdx(idx);
      let largest = idx;

      if (left < n) {
        this.pushOp("compare", [largest, left], `Comparing with left child ${this.keyOf(this.items[left])}.`);
        if (this.compare(this.items[left], this.items[largest]) > 0) largest = left;
      }
      if (right < n) {
        this.pushOp("compare", [largest, right], `Comparing with right child ${this.keyOf(this.items[right])}.`);
        if (this.compare(this.items[right], this.items[largest]) > 0) largest = right;
      }
      if (largest === idx) break;
      this.swap(
        idx,
        largest,
        `${this.keyOf(this.items[largest])} has higher priority than ${this.keyOf(this.items[idx])}. Therefore they swap, and the heap property is restored downward.`
      );
      idx = largest;
    }
  }

  /** Remove an arbitrary element (by predicate) — used for discharge-while-waiting. O(n) find + O(log n) fix-up. */
  removeWhere(predicate: (item: T) => boolean, phase: HeapOperationPhase = "rescore-manual"): T | undefined {
    this.lastOps = [];
    this.currentPhase = phase;
    const idx = this.items.findIndex(predicate);
    if (idx === -1) return undefined;
    const removed = this.items[idx];
    const last = this.items.pop()!;
    if (idx < this.items.length) {
      this.items[idx] = last;
      this.siftDown(idx);
      this.siftUp(idx);
    }
    return removed;
  }

  /** Full O(n) rebuild of the heap invariant — used after a bulk re-score (e.g. aging tick, escalation, manual edit). */
  reheapify(phase: HeapOperationPhase = "rescore-manual"): HeapOpStep[] {
    this.lastOps = [];
    this.currentPhase = phase;
    for (let i = Math.floor(this.items.length / 2) - 1; i >= 0; i--) {
      this.siftDown(i);
    }
    return this.lastOps;
  }

  /** Non-mutating sorted snapshot for display purposes only (O(n log n), never used for actual scheduling). */
  sortedSnapshot(): T[] {
    return [...this.items].sort((a, b) => this.compare(b, a));
  }

  clear() {
    this.items = [];
  }

  replaceAll(items: T[]) {
    this.items = [...items];
    this.reheapify();
  }
}
