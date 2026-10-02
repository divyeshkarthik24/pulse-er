import { DEFAULT_WEIGHTS, SEVERITY_BASE, type AlgorithmStrategyResult, type DuelFrame, type DuelStrategyKey, type Patient, type SchedulerWeights } from "../types";

type Strategy = DuelStrategyKey;

/** A patient waiting longer than this, under any strategy, counts as a starvation case. */
export const STARVATION_THRESHOLD_MINUTES = 90;

export interface SimPatient {
  id: string;
  severity: Patient["severity"];
  arrivalTime: number;
  arrivalSequence: number;
  isEmergency: boolean;
  registrationVariance: number;
  serviceMinutes: number;
}

export function scoreFor(p: SimPatient, now: number, strategy: Strategy, weights: SchedulerWeights): number {
  const base = SEVERITY_BASE[p.severity];
  const tie = p.arrivalSequence * 0.0001;
  const emergency = p.isEmergency ? weights.emergencyWeight : 0;
  if (strategy === "fifo") {
    return -p.arrivalTime; // purely arrival order
  }
  if (strategy === "priority") {
    // Severity + emergency + one-time intake variance decide the slot at
    // insertion time — but nothing ever corrects for bad luck while waiting.
    return base + emergency + p.registrationVariance - tie;
  }
  // priority-aging: full formula identical to the live scheduler
  const waitMinutes = Math.max(0, (now - p.arrivalTime) / 60000);
  const waitFactor = Math.min(waitMinutes * weights.waitWeightPerMinute, weights.waitFactorCap);
  const agingActive = waitMinutes > weights.agingThresholdMinutes;
  const agingBonus = agingActive
    ? Math.min((waitMinutes - weights.agingThresholdMinutes) * weights.agingRatePerMinute, weights.agingCap)
    : 0;
  return base + waitFactor + agingBonus + emergency + p.registrationVariance - tie;
}

interface SimResult {
  waitMinutesById: Map<string, number>;
  order: string[];
  completedAt: number;
  priorityChangeCount: number;
  frames: DuelFrame[];
}

/**
 * Discrete-time simulation of a fixed-server ER running a given
 * scheduling strategy over the same dataset. Used by the comparison
 * report and the Algorithm Duel — the live app always uses the real
 * PriorityQueue for actual scheduling.
 *
 * Also tracks `priorityChangeCount`: how many times the *relative order*
 * of an unchanged waiting pool (no arrival or departure since the last
 * check) flips purely because time passed. For "fifo" and "priority" this
 * is always 0 — neither depends on the clock. For "priority-aging" a
 * nonzero count is direct, honest evidence that aging actually reordered
 * the queue, not just nudged a score.
 */
function simulate(patients: SimPatient[], strategy: Strategy, weights: SchedulerWeights, numServers: number): SimResult {
  const sorted = [...patients].sort((a, b) => a.arrivalTime - b.arrivalTime);
  const serverFreeAt = new Array(numServers).fill(sorted[0]?.arrivalTime ?? 0);
  const waiting: SimPatient[] = [];
  const waitMinutesById = new Map<string, number>();
  const order: string[] = [];
  const frames: DuelFrame[] = [];
  let arrivalPtr = 0;
  let currentTime = sorted[0]?.arrivalTime ?? 0;
  let remaining = sorted.length;
  let maxCompletedAt = currentTime;
  let priorityChangeCount = 0;
  let lastSignature: string | null = null;
  let lastMembership: string | null = null;

  const sortedWaitingOrder = () =>
    [...waiting].sort((a, b) => scoreFor(b, currentTime, strategy, weights) - scoreFor(a, currentTime, strategy, weights));

  while (remaining > 0) {
    while (arrivalPtr < sorted.length && sorted[arrivalPtr].arrivalTime <= currentTime) {
      waiting.push(sorted[arrivalPtr]);
      arrivalPtr++;
    }

    if (waiting.length > 0) {
      const rankedNow = sortedWaitingOrder();
      const membership = [...waiting.map((p) => p.id)].sort().join(",");
      const signature = rankedNow.map((p) => p.id).join(",");
      if (lastMembership === membership && lastSignature !== null && lastSignature !== signature) {
        priorityChangeCount++;
      }
      lastMembership = membership;
      lastSignature = signature;
    }

    const freeServerIdx = serverFreeAt.findIndex((t) => t <= currentTime);
    if (freeServerIdx !== -1 && waiting.length > 0) {
      const ranked = sortedWaitingOrder();
      const next = ranked[0];
      waiting.splice(waiting.indexOf(next), 1);
      const waitMinutes = (currentTime - next.arrivalTime) / 60000;
      waitMinutesById.set(next.id, Math.max(0, waitMinutes));
      order.push(next.id);
      frames.push({
        time: currentTime,
        strategy,
        waitingOrder: waiting.map((p) => p.id),
        servedId: next.id,
        queueLength: waiting.length,
      });
      const finishAt = currentTime + next.serviceMinutes * 60000;
      serverFreeAt[freeServerIdx] = finishAt;
      maxCompletedAt = Math.max(maxCompletedAt, finishAt);
      remaining--;
      lastMembership = null;
      lastSignature = null;
      continue;
    }

    const candidates: number[] = [...serverFreeAt.filter((t) => t > currentTime)];
    if (arrivalPtr < sorted.length) candidates.push(sorted[arrivalPtr].arrivalTime);
    if (candidates.length === 0) break;
    currentTime = Math.min(...candidates);
  }

  return { waitMinutesById, order, completedAt: maxCompletedAt, priorityChangeCount, frames };
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round((values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) * 100) / 100;
}

function avg(values: number[]): number {
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0;
}

export function toSimPatients(patients: Patient[]): SimPatient[] {
  return patients.map((p) => ({
    id: p.id,
    severity: p.severity,
    arrivalTime: p.arrivalTime,
    arrivalSequence: p.arrivalSequence,
    isEmergency: p.isEmergency,
    registrationVariance: p.registrationVariance,
    serviceMinutes: p.estimatedTreatmentMinutes,
  }));
}

export const DUEL_STRATEGIES: { key: Strategy; label: string }[] = [
  { key: "fifo", label: "FIFO (arrival order only)" },
  { key: "priority", label: "Priority Queue (severity only)" },
  { key: "priority-aging", label: "Priority Queue + Aging (live algorithm)" },
];

export function runStrategyComparisonOnSimPatients(
  simPatients: SimPatient[],
  weights: SchedulerWeights = DEFAULT_WEIGHTS,
  numServers = 2
): { results: AlgorithmStrategyResult[]; frames: DuelFrame[] } {
  if (simPatients.length === 0) return { results: [], frames: [] };

  const allFrames: DuelFrame[] = [];

  const results = DUEL_STRATEGIES.map(({ key, label }) => {
    const { waitMinutesById, order, completedAt, priorityChangeCount, frames } = simulate(simPatients, key, weights, numServers);
    allFrames.push(...frames);
    const waits = [...waitMinutesById.values()];
    const bySeverityWaits = (sev: number) =>
      simPatients.filter((p) => p.severity === sev).map((p) => waitMinutesById.get(p.id) ?? 0);
    const criticalWaits = bySeverityWaits(1);
    const urgentWaits = bySeverityWaits(2);
    const lowestSeverityWaits = bySeverityWaits(5);
    const earliestArrival = Math.min(...simPatients.map((p) => p.arrivalTime));
    const totalHours = Math.max(0.1, (completedAt - earliestArrival) / 3600000);

    // Fairness proxy: variance of waiting time among same-severity peers (lower = fairer)
    const bySeverity = new Map<number, number[]>();
    simPatients.forEach((p) => {
      const arr = bySeverity.get(p.severity) ?? [];
      arr.push(waitMinutesById.get(p.id) ?? 0);
      bySeverity.set(p.severity, arr);
    });
    const fairnessVariance =
      Math.round(
        ([...bySeverity.values()].reduce((sum, arr) => sum + variance(arr), 0) / bySeverity.size) * 100
      ) / 100;

    const starvationCases = waits.filter((w) => w > STARVATION_THRESHOLD_MINUTES).length;

    return {
      strategy: key,
      label,
      avgWaitMinutes: avg(waits),
      maxWaitMinutes: waits.length ? Math.round(Math.max(...waits) * 10) / 10 : 0,
      criticalAvgWaitMinutes: avg(criticalWaits),
      urgentAvgWaitMinutes: avg(urgentWaits),
      lowestSeverityAvgWaitMinutes: avg(lowestSeverityWaits),
      fairnessVariance,
      throughputPerHour: Math.round((simPatients.length / totalHours) * 10) / 10,
      starvationCases,
      priorityChangeCount,
      order,
    };
  });

  return { results, frames: allFrames };
}

export function runStrategyComparison(
  patients: Patient[],
  weights: SchedulerWeights = DEFAULT_WEIGHTS,
  numServers = 2
): AlgorithmStrategyResult[] {
  return runStrategyComparisonOnSimPatients(toSimPatients(patients), weights, numServers).results;
}
