import { DEFAULT_WEIGHTS, type EventLogEntry, type Patient, type SchedulerConfigVersion, type SchedulerWeights } from "../types";
import { PriorityCalculator } from "../dsa/PriorityCalculator";
import { MaxHeap } from "../dsa/MaxHeap";
import type { ReplayFrame } from "./replayTypes";

/**
 * Reconstructs historical queue state on demand rather than recording a
 * snapshot per event. Every patient already carries real timestamps for
 * each status transition (arrivalTime, queuedAt, assignedAt,
 * treatmentStartedAt, completedAt) — a patient was "waiting" at instant T
 * exactly when `queuedAt <= T < (assignedAt ?? +Infinity)`. Since the
 * scoring function is pure (score = f(patient, T, weights)), we can
 * recompute the exact effective priority — and therefore exact queue
 * order — at any past instant without ever storing a queue snapshot.
 *
 * Historical correctness: every event is stamped with the
 * `configVersion` that was active when it happened (see useERStore's
 * `configHistory`). Replay looks up the *weights that were actually in
 * effect at that moment* rather than the current ones, so a replay
 * spanning a Settings change correctly reconstructs the ordering
 * decisions made under the old configuration before the change, and the
 * new one after it — without ever storing a full snapshot, just a small
 * list of {version, weights, activatedAt} entries (one per Settings
 * change, not one per event).
 */
export class QueueReplayEngine {
  private wasWaitingAt(patient: Patient, time: number): boolean {
    if (patient.queuedAt === undefined || patient.queuedAt > time) return false;
    if (patient.assignedAt !== undefined && patient.assignedAt <= time) return false;
    return true;
  }

  reconstructWaitingQueueAt(patients: Patient[], time: number, weights: SchedulerWeights = DEFAULT_WEIGHTS): Patient[] {
    const calculator = new PriorityCalculator(weights);
    const waiting = patients.filter((p) => this.wasWaitingAt(p, time));
    const scored = waiting.map((p) => {
      const breakdown = calculator.compute(p, time);
      return { ...p, priorityScore: breakdown.finalScore, priorityBreakdown: breakdown };
    });
    return scored.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /** Builds a valid (not necessarily historically-identical) heap array for display, from a reconstructed queue. */
  buildHeapArray(waitingQueue: Patient[]): Patient[] {
    const heap = new MaxHeap<Patient>(
      (a, b) => a.priorityScore - b.priorityScore,
      (p) => `${p.id} (${p.name.split(" ")[0]})`,
      (p) => p.id
    );
    heap.replaceAll(waitingQueue);
    return heap.toArray();
  }

  /** Finds the weights that were active for a given configVersion, falling back to defaults if history is empty/missing it. */
  resolveConfig(configHistory: SchedulerConfigVersion[], version: number): SchedulerConfigVersion {
    const exact = configHistory.find((c) => c.version === version);
    if (exact) return exact;
    // Fall back to the latest version at-or-before this one, else the very first, else a synthetic default.
    const candidates = configHistory.filter((c) => c.version <= version).sort((a, b) => b.version - a.version);
    return candidates[0] ?? configHistory[0] ?? { version: 1, weights: DEFAULT_WEIGHTS, activatedAt: 0 };
  }

  buildFrame(patients: Patient[], events: EventLogEntry[], index: number, configHistory: SchedulerConfigVersion[]): ReplayFrame {
    const clamped = Math.max(0, Math.min(index, events.length - 1));
    const event = events[clamped];
    const config = this.resolveConfig(configHistory, event.configVersion);
    const waitingQueue = this.reconstructWaitingQueueAt(patients, event.timestamp, config.weights);
    return {
      time: event.timestamp,
      eventIndex: clamped,
      event,
      waitingQueue,
      queueSize: waitingQueue.length,
      criticalWaiting: waitingQueue.filter((p) => p.severity === 1).length,
      config,
    };
  }
}

export function createReplayEngine(): QueueReplayEngine {
  return new QueueReplayEngine();
}
