export type QueueHealthStateKey = "optimal" | "healthy" | "busy" | "congested" | "critical";

export interface QueueHealthThreshold {
  key: QueueHealthStateKey;
  label: string;
  min: number;
  color: string;
}

/** Configurable — not magic numbers scattered through components. */
export const QUEUE_HEALTH_THRESHOLDS: QueueHealthThreshold[] = [
  { key: "optimal", label: "Optimal", min: 90, color: "var(--color-emerald)" },
  { key: "healthy", label: "Healthy", min: 75, color: "var(--color-teal)" },
  { key: "busy", label: "Busy", min: 50, color: "var(--color-amber)" },
  { key: "congested", label: "Congested", min: 25, color: "var(--color-urgent)" },
  { key: "critical", label: "Critical", min: 0, color: "var(--color-coral)" },
];

/** Sub-score weights — documented, sum to 1. Tune here, not inline in a component. */
export const QUEUE_HEALTH_WEIGHTS = {
  criticalResponse: 0.25,
  waitingTimeRisk: 0.2,
  queueLoad: 0.15,
  fairness: 0.15,
  doctorCapacity: 0.15,
  roomCapacity: 0.05,
  growthRate: 0.05,
};

export const QUEUE_HEALTH_CONFIG = {
  queueLoadPerDoctorReference: 4, // "comfortable" patients waiting per available-or-not doctor
  criticalWaitReferenceMinutes: 10, // ideal max wait for a critical patient
  criticalWaitAlertMinutes: 15,
  avgWaitReferenceMinutes: 20,
  maxWaitReferenceMinutes: 60,
  fairnessVarianceReference: 900, // variance (minutes^2) beyond which fairness score bottoms out
  congestionQueueMultiplier: 5, // queue size vs doctor count beyond which "congestion" alert fires
  growthWindowMinutes: 10,
  rapidGrowthPercent: 50, // queue growing faster than this % over the window triggers an alert
};

export interface QueueHealthBreakdown {
  queueLoad: number;
  criticalResponse: number;
  waitingTimeRisk: number;
  fairness: number;
  doctorCapacity: number;
  roomCapacity: number;
  growthRate: number;
}

export interface QueueHealthAlert {
  key: "congestion" | "critical-wait" | "capacity" | "rapid-growth";
  severity: "warning" | "critical";
  message: string;
}

export interface QueueHealthMetrics {
  score: number;
  state: QueueHealthStateKey;
  stateLabel: string;
  color: string;
  breakdown: QueueHealthBreakdown;
  alerts: QueueHealthAlert[];
  primaryPressure: string;
  recommendation: string;
  dsa: {
    heapSize: number;
    highestPriority: number;
    avgEffectivePriority: number;
    maxWaitMinutes: number;
    criticalWaiting: number;
  };
}

export interface QueueHealthInput {
  queueSize: number;
  criticalWaiting: number;
  criticalWaitMinutesList: number[];
  avgWaitMinutes: number;
  maxWaitMinutes: number;
  waitTimesBySeverity: number[][];
  doctorsAvailable: number;
  doctorsTotal: number;
  roomsAvailable: number;
  roomsTotal: number;
  queueSizeNowVsWindow: { now: number; past: number } | undefined;
  heapSize: number;
  highestPriority: number;
  avgEffectivePriority: number;
}
