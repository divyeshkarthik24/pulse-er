import {
  QUEUE_HEALTH_CONFIG,
  QUEUE_HEALTH_THRESHOLDS,
  QUEUE_HEALTH_WEIGHTS,
  type QueueHealthAlert,
  type QueueHealthBreakdown,
  type QueueHealthInput,
  type QueueHealthMetrics,
} from "./queueHealthTypes";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
}

/**
 * Weighted, documented health score — never a decorative progress bar.
 * Every sub-score is derived from real queue/DSA state; weights are
 * declared in `queueHealthTypes.ts`, not buried in a component. All
 * sub-scores are 0–100 before weighting, so the final score is a true
 * weighted average, not an arbitrary blend of incompatible units.
 */
export function computeQueueHealth(input: QueueHealthInput): QueueHealthMetrics {
  const cfg = QUEUE_HEALTH_CONFIG;
  const w = QUEUE_HEALTH_WEIGHTS;

  // Queue load: how full the queue is relative to available staff.
  const loadReference = Math.max(1, input.doctorsTotal) * cfg.queueLoadPerDoctorReference;
  const queueLoad = clamp(100 - (input.queueSize / loadReference) * 100);

  // Critical response: how fast critical patients are actually being served.
  const avgCriticalWait = input.criticalWaitMinutesList.length
    ? input.criticalWaitMinutesList.reduce((a, b) => a + b, 0) / input.criticalWaitMinutesList.length
    : 0;
  const criticalResponse = clamp(100 - (avgCriticalWait / cfg.criticalWaitReferenceMinutes) * 100);

  // Waiting-time risk: blend of average and worst-case wait.
  const avgWaitScore = clamp(100 - (input.avgWaitMinutes / cfg.avgWaitReferenceMinutes) * 100);
  const maxWaitScore = clamp(100 - (input.maxWaitMinutes / cfg.maxWaitReferenceMinutes) * 100);
  const waitingTimeRisk = clamp(avgWaitScore * 0.6 + maxWaitScore * 0.4);

  // Fairness: variance of wait times within each severity tier, averaged across tiers.
  const tierVariances = input.waitTimesBySeverity.filter((arr) => arr.length > 0).map(variance);
  const avgVariance = tierVariances.length ? tierVariances.reduce((a, b) => a + b, 0) / tierVariances.length : 0;
  const fairness = clamp(100 - (avgVariance / cfg.fairnessVarianceReference) * 100);

  const doctorCapacity = input.doctorsTotal > 0 ? clamp((input.doctorsAvailable / input.doctorsTotal) * 100) : 100;
  const roomCapacity = input.roomsTotal > 0 ? clamp((input.roomsAvailable / input.roomsTotal) * 100) : 100;

  let growthRate = 100;
  if (input.queueSizeNowVsWindow) {
    const { now, past } = input.queueSizeNowVsWindow;
    const growthPercent = past > 0 ? ((now - past) / past) * 100 : now > 0 ? 100 : 0;
    growthRate = clamp(100 - Math.max(0, growthPercent));
  }

  const breakdown: QueueHealthBreakdown = { queueLoad, criticalResponse, waitingTimeRisk, fairness, doctorCapacity, roomCapacity, growthRate };

  const score = Math.round(
    queueLoad * w.queueLoad +
      criticalResponse * w.criticalResponse +
      waitingTimeRisk * w.waitingTimeRisk +
      fairness * w.fairness +
      doctorCapacity * w.doctorCapacity +
      roomCapacity * w.roomCapacity +
      growthRate * w.growthRate
  );

  const threshold = QUEUE_HEALTH_THRESHOLDS.find((t) => score >= t.min) ?? QUEUE_HEALTH_THRESHOLDS[QUEUE_HEALTH_THRESHOLDS.length - 1];

  const alerts: QueueHealthAlert[] = [];
  if (input.queueSize > input.doctorsTotal * cfg.congestionQueueMultiplier) {
    alerts.push({ key: "congestion", severity: "warning", message: `Queue size (${input.queueSize}) exceeds the configured congestion threshold.` });
  }
  if (input.criticalWaitMinutesList.some((m) => m > cfg.criticalWaitAlertMinutes)) {
    alerts.push({ key: "critical-wait", severity: "critical", message: "A critical patient has exceeded the configured wait threshold." });
  }
  if (input.doctorsAvailable === 0 || input.roomsAvailable === 0) {
    alerts.push({ key: "capacity", severity: "warning", message: "Available doctors or treatment rooms are low." });
  }
  if (input.queueSizeNowVsWindow) {
    const { now, past } = input.queueSizeNowVsWindow;
    const growthPercent = past > 0 ? ((now - past) / past) * 100 : 0;
    if (growthPercent > cfg.rapidGrowthPercent) {
      alerts.push({ key: "rapid-growth", severity: "warning", message: "Simulation indicates the queue is growing faster than it is being processed." });
    }
  }

  const sortedFactors = (Object.entries(breakdown) as [keyof QueueHealthBreakdown, number][]).sort((a, b) => a[1] - b[1]);
  const [weakestKey, weakestValue] = sortedFactors[0];
  const PRESSURE_LABEL: Record<keyof QueueHealthBreakdown, string> = {
    queueLoad: "Queue load is the primary pressure.",
    criticalResponse: "Critical-patient response time is the primary pressure.",
    waitingTimeRisk: "Average waiting time is increasing.",
    fairness: "Fairness across similar-severity patients is the primary pressure.",
    doctorCapacity: "Doctor availability is the primary pressure.",
    roomCapacity: "Treatment room availability is the primary pressure.",
    growthRate: "The queue is growing faster than it is being cleared.",
  };
  const RECOMMENDATION: Record<keyof QueueHealthBreakdown, string> = {
    queueLoad: "Simulation indicates additional staffing could reduce queue pressure.",
    criticalResponse: "Simulation indicates critical patients may benefit from faster doctor assignment.",
    waitingTimeRisk: "Simulation indicates increased queue pressure; additional treatment capacity may help.",
    fairness: "Simulation indicates some patients are waiting disproportionately — review aging settings.",
    doctorCapacity: "Simulation indicates doctor capacity is constrained relative to demand.",
    roomCapacity: "Simulation indicates treatment room availability is constrained.",
    growthRate: "Simulation indicates arrivals are outpacing service completions.",
  };

  return {
    score,
    state: threshold.key,
    stateLabel: threshold.label,
    color: threshold.color,
    breakdown,
    alerts,
    primaryPressure: weakestValue < 80 ? PRESSURE_LABEL[weakestKey] : "No significant pressure detected.",
    recommendation: weakestValue < 80 ? RECOMMENDATION[weakestKey] : "Simulation indicates the queue is operating comfortably.",
    dsa: {
      heapSize: input.heapSize,
      highestPriority: Math.round(input.highestPriority),
      avgEffectivePriority: Math.round(input.avgEffectivePriority),
      maxWaitMinutes: Math.round(input.maxWaitMinutes * 10) / 10,
      criticalWaiting: input.criticalWaiting,
    },
  };
}
