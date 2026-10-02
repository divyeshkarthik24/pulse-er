import { describe, expect, it } from "vitest";
import { PriorityCalculator } from "./PriorityCalculator";
import { TriageEngine } from "./TriageEngine";
import { randomVitals } from "../data/randomPatient";
import { DEFAULT_WEIGHTS, type Patient, type SchedulerWeights, type SeverityLevel } from "../types";

const triageEngine = new TriageEngine();

function mkPatient(opts: {
  severity: SeverityLevel;
  arrivalMinutesAgo: number;
  isEmergency?: boolean;
  registrationVariance?: number;
  now: number;
}): Patient {
  const p = triageEngine.createPatient({
    name: "Test",
    age: 30,
    gender: "Other",
    symptoms: ["test"],
    severity: opts.severity,
    vitals: randomVitals(opts.severity),
    isEmergency: opts.isEmergency ?? false,
    arrivalTime: opts.now - opts.arrivalMinutesAgo * 60000,
  });
  if (opts.registrationVariance !== undefined) p.registrationVariance = opts.registrationVariance;
  return p;
}

describe("PriorityCalculator — safety boundary", () => {
  const now = Date.now();

  it("default weights are reported as starvation-safe", () => {
    const calc = new PriorityCalculator(DEFAULT_WEIGHTS);
    expect(calc.isStarvationSafe()).toBe(true);
    expect(calc.maxPossibleBoost()).toBeLessThan(calc.tierGap());
  });

  it("widening weights enough is correctly reported as unsafe", () => {
    const unsafeWeights: SchedulerWeights = { ...DEFAULT_WEIGHTS, agingCap: 999 };
    const calc = new PriorityCalculator(unsafeWeights);
    expect(calc.isStarvationSafe()).toBe(false);
    expect(calc.maxPossibleBoost()).toBeGreaterThan(calc.tierGap());
  });

  it("maximum possible aging/fairness boost can never outrank the next higher severity tier, under default weights", () => {
    const calc = new PriorityCalculator(DEFAULT_WEIGHTS);
    // Lower-severity patient with every boost fully maxed out.
    const disadvantaged = mkPatient({ severity: 4, arrivalMinutesAgo: 10000, isEmergency: true, registrationVariance: 40, now });
    // Higher-severity patient with zero boost at all — just arrived, no emergency, no variance.
    const justArrived = mkPatient({ severity: 3, arrivalMinutesAgo: 0, isEmergency: false, registrationVariance: 0, now });

    const scoreDisadvantaged = calc.compute(disadvantaged, now).finalScore;
    const scoreJustArrived = calc.compute(justArrived, now).finalScore;

    expect(scoreJustArrived).toBeGreaterThan(scoreDisadvantaged);
  });

  it("when the guarantee is intentionally broken via Settings, a maxed-out lower tier CAN outrank a higher tier", () => {
    const unsafeWeights: SchedulerWeights = { ...DEFAULT_WEIGHTS, agingCap: 999, agingRatePerMinute: 50 };
    const calc = new PriorityCalculator(unsafeWeights);
    expect(calc.isStarvationSafe()).toBe(false);

    const disadvantaged = mkPatient({ severity: 4, arrivalMinutesAgo: 10000, isEmergency: true, registrationVariance: 40, now });
    const justArrived = mkPatient({ severity: 3, arrivalMinutesAgo: 0, isEmergency: false, registrationVariance: 0, now });

    const scoreDisadvantaged = calc.compute(disadvantaged, now).finalScore;
    const scoreJustArrived = calc.compute(justArrived, now).finalScore;
    expect(scoreDisadvantaged).toBeGreaterThan(scoreJustArrived);
  });
});

describe("PriorityCalculator — emergency handling consistency", () => {
  const now = Date.now();
  const calc = new PriorityCalculator(DEFAULT_WEIGHTS);

  it("the emergency modifier is exactly the configured emergencyWeight when flagged, and exactly 0 otherwise", () => {
    const emergencyPatient = mkPatient({ severity: 3, arrivalMinutesAgo: 5, isEmergency: true, now });
    const normalPatient = mkPatient({ severity: 3, arrivalMinutesAgo: 5, isEmergency: false, now });
    expect(calc.compute(emergencyPatient, now).emergencyModifier).toBe(DEFAULT_WEIGHTS.emergencyWeight);
    expect(calc.compute(normalPatient, now).emergencyModifier).toBe(0);
  });

  it("the emergency modifier is applied consistently across every severity tier", () => {
    ([1, 2, 3, 4, 5] as SeverityLevel[]).forEach((sev) => {
      const p = mkPatient({ severity: sev, arrivalMinutesAgo: 0, isEmergency: true, now });
      expect(calc.compute(p, now).emergencyModifier).toBe(DEFAULT_WEIGHTS.emergencyWeight);
    });
  });

  it("the displayed breakdown's finalScore always equals the sum of its own parts (no UI/engine discrepancy)", () => {
    const p = mkPatient({ severity: 2, arrivalMinutesAgo: 45, isEmergency: true, registrationVariance: 18, now });
    const b = calc.compute(p, now);
    const recomputed = b.severityBase + b.waitFactor + b.agingBonus + b.emergencyModifier + b.registrationVariance - b.tieBreaker;
    expect(b.finalScore).toBeCloseTo(recomputed, 1);
  });
});
