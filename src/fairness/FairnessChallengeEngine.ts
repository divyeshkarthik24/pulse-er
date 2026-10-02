import { TriageEngine } from "../dsa/TriageEngine";
import { randomVitals } from "../data/randomPatient";
import type { Patient, SeverityLevel } from "../types";
import type { FairnessScenarioKey } from "./fairnessTypes";

const engine = new TriageEngine();

function makePatient(
  name: string,
  severity: SeverityLevel,
  arrivalOffsetMin: number,
  now: number,
  opts?: { variance?: number; isEmergency?: boolean }
): Patient {
  const p = engine.createPatient({
    name,
    age: 30 + Math.round(arrivalOffsetMin),
    gender: "Other",
    symptoms: ["Demonstration scenario"],
    severity,
    vitals: randomVitals(severity),
    isEmergency: opts?.isEmergency ?? false,
    arrivalTime: now - arrivalOffsetMin * 60000,
  });
  if (opts?.variance !== undefined) p.registrationVariance = opts.variance;
  p.status = "queued";
  p.queuedAt = p.arrivalTime;
  return p;
}

/**
 * Builds a hand-crafted, deterministic dataset for each scenario — never
 * random — so a presenter gets the same demonstration every time. Scoring
 * itself still runs through the production `PriorityCalculator`; nothing
 * about *how priority is computed* is special-cased here.
 */
export function buildFairnessScenario(key: FairnessScenarioKey, now: number): Patient[] {
  switch (key) {
    case "same-severity":
      // A arrived first (8 min ago), B second (4 min ago), C just now — all identical severity and variance,
      // so the production formula should rank them purely by arrival order: A, B, C.
      return [
        makePatient("Patient A", 2, 8, now, { variance: 0 }),
        makePatient("Patient B", 2, 4, now, { variance: 0 }),
        makePatient("Patient C", 2, 0, now, { variance: 0 }),
      ];

    case "long-wait":
      // A arrived 15 minutes before B, but drew unlucky intake variance (+2) while B drew
      // lucky variance (+32) — a 30-point gap. A's 15-minute head start alone isn't enough to
      // close that gap (max wait-only contribution ≈ 15 pts), but once both patients are past
      // the aging threshold, A's combined wait+aging credit grows ~3 pts/min faster than B's
      // (same severity, A always has 15 more minutes on the clock), closing a 30-point gap in
      // well under 20 minutes of additional waiting — a reorder driven purely by fairness.
      return [
        makePatient("Patient A (unlucky variance)", 3, 15, now, { variance: 2 }),
        makePatient("Patient B (lucky variance)", 3, 0, now, { variance: 32 }),
      ];

    case "escalation":
      return [
        makePatient("Patient A", 3, 10, now, { variance: 10 }),
        makePatient("Patient B (will escalate)", 3, 6, now, { variance: 10 }),
        makePatient("Patient C", 4, 15, now, { variance: 10 }),
      ];

    case "starvation":
      return [makePatient("Patient Z (low severity)", 4, 0, now, { variance: 10 })];

    case "safety-boundary":
      return [
        makePatient("Patient A (Critical)", 1, 2, now, { variance: 20 }),
        makePatient("Patient B (Stable)", 4, 90, now, { variance: 40 }),
      ];
  }
}

export function freshArrival(severity: SeverityLevel, now: number, label: string): Patient {
  return makePatient(label, severity, 0, now, { variance: Math.round(Math.random() * 20) });
}
