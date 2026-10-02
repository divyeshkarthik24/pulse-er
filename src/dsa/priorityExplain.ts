import type { PriorityBreakdown } from "../types";

/**
 * Groups the raw formula terms (already computed by `PriorityCalculator`)
 * into the three *conceptually distinct* ideas the problem statement asks
 * for, so the UI never conflates them:
 *
 *  - Urgency: driven by clinical severity. Severity base + the emergency
 *    flag are both direct urgency signals (the emergency flag says "this
 *    specific case is more time-critical than its severity tier alone
 *    implies", which is still an urgency judgment, not a fairness one).
 *
 *  - Fairness: exists purely to stop a patient from being *indefinitely*
 *    disadvantaged by something that isn't urgency — how long they've
 *    waited (waiting credit + aging bonus), and the one-time intake
 *    variance that aging is specifically there to correct for. None of
 *    this can ever cross a severity tier (see `isStarvationSafe`), so it
 *    never overrides urgency — it only arbitrates *among* similarly
 *    urgent patients.
 *
 *  - Tie-breaking: the arrival-sequence term. It is scaled to roughly
 *    1/10,000th of a point specifically so it can never influence a real
 *    decision — it only resolves the case where two patients would
 *    otherwise be *exactly* equal.
 *
 * This function performs no new computation; it is a read-only lens over
 * values `PriorityCalculator.compute` already produced, so the UI can
 * never disagree with what the engine actually did.
 */
export interface PriorityConcepts {
  urgency: number;
  fairness: number;
  tieBreak: number;
}

export function classifyPriorityTerms(b: PriorityBreakdown): PriorityConcepts {
  return {
    urgency: b.severityBase + b.emergencyModifier,
    fairness: b.waitFactor + b.agingBonus + b.registrationVariance,
    tieBreak: -b.tieBreaker,
  };
}

export interface FormulaStep {
  key: string;
  label: string;
  value: number;
  concept: "urgency" | "fairness" | "tiebreak";
}

export function formulaSteps(b: PriorityBreakdown): FormulaStep[] {
  return [
    { key: "severityBase", label: "Severity Base", value: b.severityBase, concept: "urgency" },
    { key: "emergencyModifier", label: "Emergency Modifier", value: b.emergencyModifier, concept: "urgency" },
    { key: "waitFactor", label: "Waiting Credit", value: b.waitFactor, concept: "fairness" },
    { key: "agingBonus", label: "Aging Bonus", value: b.agingBonus, concept: "fairness" },
    { key: "registrationVariance", label: "Intake Variance", value: b.registrationVariance, concept: "fairness" },
  ];
}
