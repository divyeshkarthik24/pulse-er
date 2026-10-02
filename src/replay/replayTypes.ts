import type { EventLogEntry, Patient, SchedulerConfigVersion } from "../types";

/** A reconstructed instant in ER history — derived on demand, never stored. */
export interface ReplayFrame {
  time: number;
  eventIndex: number;
  event: EventLogEntry;
  waitingQueue: Patient[];
  queueSize: number;
  criticalWaiting: number;
  /** The scheduler configuration that was actually active at this instant. */
  config: SchedulerConfigVersion;
}

export interface ReplayState {
  events: EventLogEntry[]; // oldest -> newest (the engine expects chronological order)
  currentIndex: number;
}
