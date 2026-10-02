// Shared domain types for the ER Patient Management simulator.
// Educational simulation only — not a real medical decision system.

export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export const SEVERITY_META: Record<
  SeverityLevel,
  { label: string; short: string; color: string; description: string }
> = {
  1: {
    label: "Critical",
    short: "CRIT",
    color: "#c0392b",
    description: "Immediate life threat — requires instant intervention.",
  },
  2: {
    label: "Urgent",
    short: "URG",
    color: "#d9772f",
    description: "Serious condition, must be seen very soon.",
  },
  3: {
    label: "Moderate",
    short: "MOD",
    color: "#b8932f",
    description: "Stable but needs timely attention.",
  },
  4: {
    label: "Stable",
    short: "STB",
    color: "#2f7a5c",
    description: "Non-life-threatening, can safely wait.",
  },
  5: {
    label: "Non-Urgent",
    short: "N-URG",
    color: "#4a6fa5",
    description: "Minor complaint, lowest clinical urgency.",
  },
};

export type PatientStatus =
  | "registered"
  | "triage"
  | "queued"
  | "assigned"
  | "in-treatment"
  | "completed"
  | "discharged";

export const STATUS_LABEL: Record<PatientStatus, string> = {
  registered: "Registered",
  triage: "In Triage",
  queued: "Waiting in Queue",
  assigned: "Assigned to Doctor",
  "in-treatment": "In Treatment",
  completed: "Treatment Completed",
  discharged: "Discharged",
};

export interface VitalSigns {
  heartRate: number; // bpm
  systolicBP: number;
  diastolicBP: number;
  spo2: number; // %
  temperatureC: number;
  respRate: number; // breaths/min
}

export interface PriorityBreakdown {
  severityBase: number;
  waitMinutes: number;
  waitFactor: number;
  agingBonus: number;
  agingActive: boolean;
  emergencyModifier: number;
  registrationVariance: number;
  tieBreaker: number;
  finalScore: number;
  computedAt: number;
}

/**
 * Maximum points a patient's one-time "registration variance" can add.
 * Real intake isn't perfectly FCFS even within one severity tier (which
 * nurse triaged them, paperwork lag, which bed opened up) — modeling a
 * small bounded variance here is what makes aging *do* something: without
 * it, a strict arrival tie-break already guarantees perfect same-tier
 * FCFS forever, and a monotonically-growing wait/aging bonus can never
 * change an ordering that never needed correcting. With it, a patient who
 * drew unlucky variance can be visibly overtaken by aging as they wait —
 * while the cross-tier safety guarantee (see PriorityCalculator) still
 * holds because this is included in the bounded max-boost calculation.
 */
export const REGISTRATION_VARIANCE_MAX = 40;

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  symptoms: string[];
  severity: SeverityLevel;
  triageCategory: string;
  vitals: VitalSigns;
  isEmergency: boolean;
  department?: string;
  assignedDoctorId?: string;
  status: PatientStatus;
  arrivalTime: number;
  arrivalSequence: number;
  registrationVariance: number;
  queuedAt?: number;
  assignedAt?: number;
  treatmentStartedAt?: number;
  completedAt?: number;
  estimatedTreatmentMinutes: number;
  priorityScore: number;
  priorityBreakdown: PriorityBreakdown;
  escalationCount: number;
  severityHistory: { severity: SeverityLevel; at: number; reason: string }[];
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  available: boolean;
  currentPatientId?: string;
  patientsSeenToday: number;
}

export interface Department {
  id: string;
  name: string;
  roomsTotal: number;
  roomsOccupied: number;
}

export type EventType =
  | "arrival"
  | "triage-complete"
  | "priority-calculated"
  | "heap-insert"
  | "heap-reorder"
  | "priority-updated"
  | "aging-applied"
  | "position-change"
  | "escalation"
  | "doctor-assigned"
  | "treatment-start"
  | "treatment-complete"
  | "discharge"
  | "simulation"
  | "config-changed";

/** A single before/after fact shown in the Queue Replay "What changed?" panel. */
export interface ReplayChange {
  label: string;
  before: string;
  after: string;
}

/**
 * A versioned snapshot of the scheduling-relevant weights, captured every
 * time Settings changes them. `SchedulerWeights` already contains nothing
 * but scheduling parameters (no unrelated UI preferences), so the whole
 * object is the "minimal configuration data" worth versioning.
 */
export interface SchedulerConfigVersion {
  version: number;
  weights: SchedulerWeights;
  activatedAt: number;
}

export interface EventLogEntry {
  id: string;
  type: EventType;
  timestamp: number;
  /** Which scheduler configuration was active when this event occurred — see SchedulerConfigVersion. */
  configVersion: number;
  patientId?: string;
  patientLabel?: string;
  message: string;
  detail?: string;
  /** Compact structured diff for Queue Replay — populated only for events where something measurable changed. */
  changes?: ReplayChange[];
}

export interface SchedulerWeights {
  severityMultiplier: number; // scales SEVERITY_BASE table
  waitWeightPerMinute: number; // points per minute waited
  waitFactorCap: number; // max contribution from raw waiting time
  agingThresholdMinutes: number; // minutes before aging kicks in
  agingRatePerMinute: number; // extra points per minute once aging is active
  agingCap: number; // max contribution from aging
  emergencyWeight: number; // flat bonus for emergency-flagged patients
}

export const DEFAULT_WEIGHTS: SchedulerWeights = {
  severityMultiplier: 1,
  waitWeightPerMinute: 1,
  waitFactorCap: 80,
  agingThresholdMinutes: 20,
  agingRatePerMinute: 2,
  agingCap: 120,
  emergencyWeight: 60,
};

export const SEVERITY_BASE: Record<SeverityLevel, number> = {
  1: 2000,
  2: 1600,
  3: 1200,
  4: 800,
  5: 400,
};

export type HeapOpType = "compare" | "swap" | "set-root" | "none";

/**
 * Which named operation a sequence of low-level heap steps belongs to —
 * lets the UI label a run of compares/swaps as "Heapify Up" vs "Rescore
 * (aging)" vs "Reordering (escalation)" without the heap itself knowing
 * anything about patients, aging, or escalation.
 */
export type HeapOperationPhase =
  | "insert"
  | "extract-max"
  | "peek"
  | "heapify-up"
  | "heapify-down"
  | "rescore-aging"
  | "rescore-escalation"
  | "rescore-manual";

export const HEAP_PHASE_LABEL: Record<HeapOperationPhase, string> = {
  insert: "Insert",
  "extract-max": "Extract Max",
  peek: "Peek",
  "heapify-up": "Heapify Up",
  "heapify-down": "Heapify Down",
  "rescore-aging": "Rescore (Aging)",
  "rescore-escalation": "Reordering (Escalation)",
  "rescore-manual": "Rescore (Manual)",
};

export interface HeapOpStep {
  type: HeapOpType;
  indices: number[];
  note: string;
  /** Named operation this step belongs to — set by the caller, not the heap. */
  phase: HeapOperationPhase;
  /** Heap array ids, in order, *after* this step's mutation — lets a UI replay history. */
  snapshot: string[];
}

export type DuelStrategyKey = "fifo" | "priority" | "priority-aging";

export interface AlgorithmStrategyResult {
  strategy: DuelStrategyKey;
  label: string;
  avgWaitMinutes: number;
  maxWaitMinutes: number;
  criticalAvgWaitMinutes: number;
  urgentAvgWaitMinutes: number;
  lowestSeverityAvgWaitMinutes: number;
  fairnessVariance: number;
  throughputPerHour: number;
  starvationCases: number;
  priorityChangeCount: number;
  order: string[];
}

/** One point along a strategy's timeline during an Algorithm Duel run — used to animate parallel queues. */
export interface DuelFrame {
  time: number;
  strategy: DuelStrategyKey;
  waitingOrder: string[];
  servedId?: string;
  queueLength: number;
}

export interface AlgorithmDuelResult {
  seed: number;
  results: AlgorithmStrategyResult[];
  frames: DuelFrame[];
  datasetSize: number;
}
