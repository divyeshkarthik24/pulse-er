import { describe, expect, it } from "vitest";
import { MaxHeap } from "./MaxHeap";

function isValidMaxHeap(items: number[]): boolean {
  for (let i = 0; i < items.length; i++) {
    const left = i * 2 + 1;
    const right = i * 2 + 2;
    if (left < items.length && items[left] > items[i]) return false;
    if (right < items.length && items[right] > items[i]) return false;
  }
  return true;
}

describe("MaxHeap", () => {
  it("maintains the max-heap invariant after a sequence of inserts", () => {
    const heap = new MaxHeap<number>((a, b) => a - b, String);
    const values = [5, 20, 3, 18, 42, 7, 1, 99, 15];
    values.forEach((v) => heap.insert(v));
    expect(isValidMaxHeap(heap.toArray())).toBe(true);
    expect(heap.size).toBe(values.length);
    expect(heap.peek()).toBe(99);
  });

  it("extracts in strictly descending order (sorted snapshot matches repeated extraction)", () => {
    const heap = new MaxHeap<number>((a, b) => a - b, String);
    const values = [5, 20, 3, 18, 42, 7, 1, 99, 15, 60];
    values.forEach((v) => heap.insert(v));
    const extracted: number[] = [];
    while (heap.size > 0) {
      extracted.push(heap.extractMax()!);
      if (heap.size > 0) expect(isValidMaxHeap(heap.toArray())).toBe(true);
    }
    expect(extracted).toEqual([...values].sort((a, b) => b - a));
  });

  it("tags insert operations with phase 'insert' then 'heapify-up'", () => {
    const heap = new MaxHeap<number>((a, b) => a - b, String);
    heap.insert(1);
    heap.insert(2);
    const ops = heap.insert(3); // bubbles all the way to root
    expect(ops[0].phase).toBe("insert");
    expect(ops.slice(1).every((o) => o.phase === "heapify-up")).toBe(true);
  });

  it("tags extract operations with phase 'extract-max' then 'heapify-down'", () => {
    const heap = new MaxHeap<number>((a, b) => a - b, String);
    [10, 50, 20, 40, 30].forEach((v) => heap.insert(v));
    const max = heap.extractMax();
    expect(max).toBe(50);
    const loggedOps = heap.lastOps;
    expect(loggedOps[0].phase).toBe("extract-max");
    expect(loggedOps.slice(1).every((o) => o.phase === "heapify-down")).toBe(true);
  });

  it("tags reheapify with the caller-supplied phase (e.g. rescore-aging)", () => {
    const heap = new MaxHeap<number>((a, b) => a - b, String);
    [10, 50, 20, 40, 30].forEach((v) => heap.insert(v));
    const ops = heap.reheapify("rescore-aging");
    expect(ops.every((o) => o.phase === "rescore-aging")).toBe(true);
  });

  it("every step's snapshot reflects the heap's actual array content at that point", () => {
    const heap = new MaxHeap<number>((a, b) => a - b, String);
    [10, 50, 20].forEach((v) => heap.insert(v));
    const ops = heap.insert(100); // should bubble to root
    const lastStep = ops[ops.length - 1];
    expect(lastStep.snapshot).toEqual(heap.toArray().map(String));
  });

  it("peek is non-mutating", () => {
    const heap = new MaxHeap<number>((a, b) => a - b, String);
    [10, 50, 20].forEach((v) => heap.insert(v));
    const before = heap.toArray();
    heap.peek();
    expect(heap.toArray()).toEqual(before);
  });
});
