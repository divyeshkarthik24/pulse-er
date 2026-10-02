import { MaxHeap } from "./MaxHeap";
import { PriorityCalculator } from "./PriorityCalculator";
import type { HeapOperationPhase, HeapOpStep, Patient } from "../types";

export interface PositionChange {
  patientId: string;
  from: number;
  to: number;
  reason: string;
}

export interface RefreshResult {
  ops: HeapOpStep[];
  positionChanges: PositionChange[];
}

/**
 * Patient-specific priority queue. Wraps the generic MaxHeap and owns
 * the bookkeeping needed to make the algorithm explainable: tracking
 * position changes across re-scoring ticks, and exposing both the raw
 * heap array (for the "Heap Array" visualization) and a sorted
 * snapshot (for the human-facing queue list).
 */
export class PriorityQueue {
  private heap: MaxHeap<Patient>;
  private calculator: PriorityCalculator;

  constructor(calculator: PriorityCalculator) {
    this.calculator = calculator;
    this.heap = new MaxHeap<Patient>(
      (a, b) => a.priorityScore - b.priorityScore,
      (p) => `${p.id} (${p.name.split(" ")[0]})`,
      (p) => p.id
    );
  }

  get size() {
    return this.heap.size;
  }

  peekNext(): Patient | undefined {
    return this.heap.peek();
  }

  /** Peek, but also record a one-step op entry so the Heap Stepper can show it. */
  peekLogged(): { patient: Patient | undefined; ops: HeapOpStep[] } {
    const ids = this.heap.toArray().map((p) => p.id);
    const patient = this.heap.peek();
    const ops: HeapOpStep[] = patient
      ? [
          {
            type: "none",
            indices: [0],
            note: `Peeked at the root: ${patient.name} (${patient.id}). No mutation — O(1).`,
            phase: "peek",
            snapshot: ids,
          },
        ]
      : [];
    return { patient, ops };
  }

  heapArray(): Patient[] {
    return this.heap.toArray();
  }

  sortedByPriority(): Patient[] {
    return this.heap.sortedSnapshot();
  }

  lastOps(): HeapOpStep[] {
    return this.heap.lastOps;
  }

  private orderIndex(): Map<string, number> {
    const order = this.heap.sortedSnapshot();
    const map = new Map<string, number>();
    order.forEach((p, i) => map.set(p.id, i));
    return map;
  }

  insert(patient: Patient, now: number): HeapOpStep[] {
    patient.priorityBreakdown = this.calculator.compute(patient, now);
    patient.priorityScore = patient.priorityBreakdown.finalScore;
    return this.heap.insert(patient);
  }

  extractNext(): Patient | undefined {
    return this.heap.extractMax();
  }

  removePatient(patientId: string): Patient | undefined {
    return this.heap.removeWhere((p) => p.id === patientId);
  }

  /** Recompute every waiting patient's score (time has passed) and re-heapify. */
  refreshAll(now: number, phase: HeapOperationPhase = "rescore-aging"): RefreshResult {
    const before = this.orderIndex();
    const items = this.heap.toArray();
    for (const p of items) {
      p.priorityBreakdown = this.calculator.compute(p, now);
      p.priorityScore = p.priorityBreakdown.finalScore;
    }
    const ops = this.heap.reheapify(phase);
    const after = this.orderIndex();

    const positionChanges: PositionChange[] = [];
    after.forEach((toIdx, id) => {
      const fromIdx = before.get(id);
      if (fromIdx !== undefined && fromIdx !== toIdx) {
        const patient = items.find((p) => p.id === id);
        const reason =
          patient?.priorityBreakdown.agingActive && toIdx < fromIdx
            ? "waiting time triggered an aging/fairness bonus"
            : toIdx < fromIdx
            ? "priority increased relative to peers"
            : "overtaken by a higher-priority patient";
        positionChanges.push({ patientId: id, from: fromIdx, to: toIdx, reason });
      }
    });

    return { ops, positionChanges };
  }

  /** Re-score a single patient immediately (e.g. after manual severity escalation). */
  rescoreOne(patient: Patient, now: number, phase: HeapOperationPhase = "rescore-escalation") {
    patient.priorityBreakdown = this.calculator.compute(patient, now);
    patient.priorityScore = patient.priorityBreakdown.finalScore;
    this.heap.reheapify(phase);
  }

  clear() {
    this.heap.clear();
  }

  loadAll(patients: Patient[]) {
    this.heap.replaceAll(patients);
  }
}
