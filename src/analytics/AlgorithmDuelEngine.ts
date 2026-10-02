import { generateRandomPatient } from "../data/randomPatient";
import {
  REGISTRATION_VARIANCE_MAX,
  type AlgorithmDuelResult,
  type Patient,
  type SchedulerWeights,
  type SeverityLevel,
} from "../types";
import { runStrategyComparisonOnSimPatients, toSimPatients } from "./algorithmComparison";

/**
 * Deterministic PRNG (mulberry32) so an Algorithm Duel scenario is fully
 * reproducible from its seed — the same seed always produces the exact
 * same patient dataset, which is then cloned and replayed unmodified
 * under all three strategies. This is what makes "same input, three
 * algorithms" a scientifically meaningful comparison rather than a vibe.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DuelConfig {
  seed: number;
  patientCount: number;
  numServers: number;
  arrivalSpanMinutes: number;
  severityWeights: Record<SeverityLevel, number>;
}

export const DEFAULT_DUEL_CONFIG: DuelConfig = {
  seed: 42,
  patientCount: 18,
  numServers: 2,
  arrivalSpanMinutes: 180,
  severityWeights: { 1: 6, 2: 16, 3: 34, 4: 29, 5: 15 },
};

const SERVICE_MINUTES_RANGE: Record<SeverityLevel, [number, number]> = {
  1: [35, 70],
  2: [25, 50],
  3: [15, 35],
  4: [10, 25],
  5: [5, 15],
};

function pickSeverity(rand: () => number, weights: Record<SeverityLevel, number>): SeverityLevel {
  const total = ([1, 2, 3, 4, 5] as SeverityLevel[]).reduce((sum, sev) => sum + weights[sev], 0);
  let r = rand() * total;
  for (const sev of [1, 2, 3, 4, 5] as SeverityLevel[]) {
    if (r < weights[sev]) return sev;
    r -= weights[sev];
  }
  return 3;
}

/**
 * Builds ONE scenario from a seed. Cosmetic fields (name, vitals,
 * symptoms) come from the normal patient generator and may vary run to
 * run — they never feed into scheduling decisions. Every field that
 * *does* affect scheduling (severity, arrival time, emergency flag,
 * registration variance, service duration, arrival sequence) is set
 * deterministically from the seeded PRNG, so re-running the same seed
 * reproduces the identical scenario for all three algorithms.
 */
export function generateDuelDataset(config: DuelConfig, now: number): Patient[] {
  const rand = mulberry32(config.seed);
  const patients: Patient[] = [];

  for (let i = 0; i < config.patientCount; i++) {
    const severity = pickSeverity(rand, config.severityWeights);
    const arrivalOffsetMin = rand() * config.arrivalSpanMinutes;
    const p = generateRandomPatient({ severity, arrivalTime: now - (config.arrivalSpanMinutes - arrivalOffsetMin) * 60000 });

    p.isEmergency = severity === 1 ? rand() < 0.7 : severity === 2 ? rand() < 0.25 : rand() < 0.03;
    p.registrationVariance = Math.round(rand() * REGISTRATION_VARIANCE_MAX * 10) / 10;
    const [min, max] = SERVICE_MINUTES_RANGE[severity];
    p.estimatedTreatmentMinutes = Math.round(min + rand() * (max - min));
    p.status = "queued";
    p.queuedAt = p.arrivalTime;
    patients.push(p);
  }

  // Arrival sequence must correlate with actual arrival time for the
  // tie-breaker to mean "earlier arrival" within this scenario — the
  // global creation-order sequence assigned by TriageEngine doesn't
  // necessarily match, since arrival *times* here are seeded independently
  // of generation order. IDs are likewise reassigned deterministically
  // (TriageEngine's global id counter is shared app-wide and not seeded,
  // so the same seed would otherwise still produce different id strings
  // on each run) — this is what makes the whole scenario byte-reproducible.
  patients.sort((a, b) => a.arrivalTime - b.arrivalTime);
  patients.forEach((p, i) => {
    p.arrivalSequence = i + 1;
    p.id = `D${config.seed}-${i + 1}`;
  });

  return patients;
}

export function runAlgorithmDuel(config: DuelConfig, weights: SchedulerWeights, now: number): AlgorithmDuelResult {
  const dataset = generateDuelDataset(config, now);
  const simPatients = toSimPatients(dataset);
  const { results, frames } = runStrategyComparisonOnSimPatients(simPatients, weights, config.numServers);
  return { seed: config.seed, results, frames, datasetSize: dataset.length };
}

export function buildDuelInterpretation(result: AlgorithmDuelResult): string[] {
  const fifo = result.results.find((r) => r.strategy === "fifo");
  const priority = result.results.find((r) => r.strategy === "priority");
  const aging = result.results.find((r) => r.strategy === "priority-aging");
  const lines: string[] = [];
  if (fifo && priority) {
    lines.push(
      fifo.criticalAvgWaitMinutes > priority.criticalAvgWaitMinutes
        ? `FIFO: critical patients waited ${fifo.criticalAvgWaitMinutes}m on average — behind whoever arrived earlier, severity notwithstanding.`
        : `FIFO: critical patients happened to wait about as long (${fifo.criticalAvgWaitMinutes}m) as under Priority Queue in this run.`
    );
    lines.push(
      `Priority Queue: critical patients were promoted by severity, averaging ${priority.criticalAvgWaitMinutes}m — ${
        fifo.criticalAvgWaitMinutes > priority.criticalAvgWaitMinutes ? "an improvement" : "no worse"
      } over FIFO.`
    );
  }
  if (priority && aging) {
    if (aging.priorityChangeCount > 0) {
      lines.push(
        `Priority + Aging: severity remained dominant, but aging changed the waiting order ${aging.priorityChangeCount} time(s) as patients accumulated wait credit — fairness variance ${aging.fairnessVariance} vs ${priority.fairnessVariance} for severity alone.`
      );
    } else {
      lines.push(
        `Priority + Aging: in this particular run, no patient waited long enough relative to peers for aging to change the serving order — fairness variance stayed at ${aging.fairnessVariance}.`
      );
    }
  }
  return lines;
}
