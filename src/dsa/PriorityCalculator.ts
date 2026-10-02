import {
  DEFAULT_WEIGHTS,
  REGISTRATION_VARIANCE_MAX,
  SEVERITY_BASE,
  type Patient,
  type PriorityBreakdown,
  type SchedulerWeights,
} from "../types";

/**
 * Pure, deterministic scoring function. No per-tick randomness — the one
 * random input (registrationVariance) is rolled once at patient creation
 * and stored on the patient, so given the same patient + weights +
 * timestamp you always get the same score and the same explanation.
 *
 * Score = severityBase
 *       + min(waitMinutes * waitWeight, waitFactorCap)        // raw waiting credit
 *       + agingBonus                                          // starvation prevention
 *       + (isEmergency ? emergencyWeight : 0)
 *       + registrationVariance                                // small one-time intake variance
 *       - tieBreaker                                          // breaks exact ties by arrival
 *
 * Why registrationVariance exists: real intake is never perfectly FCFS
 * even within one severity tier (different nurse, paperwork lag, which
 * bed freed up). Modeling a small bounded variance is also what makes
 * aging *mean* something — without it, two same-severity patients would
 * be ordered by arrival time forever (a strict tie-break), and since both
 * patients' wait/aging bonuses grow in lockstep with arrival order, aging
 * could never change an order that never needed correcting. With it, a
 * patient who drew unlucky variance against a same-tier peer can be
 * visibly overtaken again by aging the longer they wait.
 *
 * Starvation-safety guarantee (holds for the default weights): the
 * maximum possible boost a patient can ever earn from waiting + aging +
 * emergency + registration variance is strictly smaller than the gap
 * between two adjacent severity tiers (400 pts). That means no amount of
 * waiting can ever let a Stable patient outrank a genuinely Critical one.
 * Widening the weights in Settings can break this guarantee on purpose,
 * for experimentation.
 */
export class PriorityCalculator {
  private weights: SchedulerWeights;

  constructor(weights: SchedulerWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  setWeights(weights: SchedulerWeights) {
    this.weights = weights;
  }

  getWeights(): SchedulerWeights {
    return this.weights;
  }

  maxPossibleBoost(): number {
    const w = this.weights;
    return w.waitFactorCap + w.agingCap + w.emergencyWeight + REGISTRATION_VARIANCE_MAX;
  }

  tierGap(): number {
    return SEVERITY_BASE[1] - SEVERITY_BASE[2];
  }

  isStarvationSafe(): boolean {
    return this.maxPossibleBoost() < this.tierGap();
  }

  compute(patient: Patient, now: number): PriorityBreakdown {
    const w = this.weights;
    const severityBase = SEVERITY_BASE[patient.severity] * w.severityMultiplier;
    const waitMs = Math.max(0, now - patient.arrivalTime);
    const waitMinutes = waitMs / 60000;

    const waitFactor = Math.min(waitMinutes * w.waitWeightPerMinute, w.waitFactorCap);

    const agingActive = waitMinutes > w.agingThresholdMinutes;
    const agingBonus = agingActive
      ? Math.min((waitMinutes - w.agingThresholdMinutes) * w.agingRatePerMinute, w.agingCap)
      : 0;

    const emergencyModifier = patient.isEmergency ? w.emergencyWeight : 0;
    const registrationVariance = patient.registrationVariance;

    // Smaller sequence number (earlier arrival) => smaller penalty => ranks higher.
    // Scaled tiny so it only breaks genuine exact ties, never dominates real factors.
    const tieBreaker = patient.arrivalSequence * 0.0001;

    const finalScore =
      severityBase + waitFactor + agingBonus + emergencyModifier + registrationVariance - tieBreaker;

    return {
      severityBase,
      waitMinutes: Math.round(waitMinutes * 10) / 10,
      waitFactor: Math.round(waitFactor * 10) / 10,
      agingBonus: Math.round(agingBonus * 10) / 10,
      agingActive,
      emergencyModifier,
      registrationVariance: Math.round(registrationVariance * 10) / 10,
      tieBreaker,
      finalScore: Math.round(finalScore * 100) / 100,
      computedAt: now,
    };
  }

  explain(patient: Patient): string {
    const b = patient.priorityBreakdown;
    const parts: string[] = [];
    parts.push(`Severity "${patient.triageCategory}" contributes ${b.severityBase} base points.`);
    if (b.waitFactor > 0) {
      parts.push(
        `Waited ${b.waitMinutes} min, adding +${b.waitFactor} waiting credit.`
      );
    }
    if (b.agingActive) {
      parts.push(
        `Waiting exceeded the aging threshold, adding a further +${b.agingBonus} fairness (aging) bonus to prevent starvation.`
      );
    }
    if (b.emergencyModifier > 0) {
      parts.push(`Flagged as an emergency case, adding +${b.emergencyModifier}.`);
    }
    if (b.registrationVariance > 0.5) {
      parts.push(`Intake variance added +${b.registrationVariance}.`);
    }
    parts.push(`Final effective priority: ${b.finalScore}.`);
    return parts.join(" ");
  }
}
