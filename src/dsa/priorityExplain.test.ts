import { describe, expect, it } from "vitest";
import { classifyPriorityTerms, formulaSteps } from "./priorityExplain";
import type { PriorityBreakdown } from "../types";

function mkBreakdown(overrides: Partial<PriorityBreakdown> = {}): PriorityBreakdown {
  return {
    severityBase: 1200,
    waitMinutes: 10,
    waitFactor: 10,
    agingBonus: 5,
    agingActive: false,
    emergencyModifier: 60,
    registrationVariance: 12,
    tieBreaker: 0.0003,
    finalScore: 1200 + 10 + 5 + 60 + 12 - 0.0003,
    computedAt: Date.now(),
    ...overrides,
  };
}

describe("priorityExplain", () => {
  it("groups urgency as severityBase + emergencyModifier", () => {
    const b = mkBreakdown();
    const c = classifyPriorityTerms(b);
    expect(c.urgency).toBe(b.severityBase + b.emergencyModifier);
  });

  it("groups fairness as waitFactor + agingBonus + registrationVariance", () => {
    const b = mkBreakdown();
    const c = classifyPriorityTerms(b);
    expect(c.fairness).toBe(b.waitFactor + b.agingBonus + b.registrationVariance);
  });

  it("tie-break is the (tiny, positive) arrival-sequence penalty, reported as its true sign", () => {
    const b = mkBreakdown();
    const c = classifyPriorityTerms(b);
    expect(c.tieBreak).toBe(-b.tieBreaker);
  });

  it("urgency + fairness + tieBreak reconstructs the final score", () => {
    const b = mkBreakdown();
    const c = classifyPriorityTerms(b);
    expect(c.urgency + c.fairness + c.tieBreak).toBeCloseTo(b.finalScore, 6);
  });

  it("formulaSteps lists exactly the five terms shown in the formula diagram, each tagged with its concept", () => {
    const steps = formulaSteps(mkBreakdown());
    expect(steps.map((s) => s.key)).toEqual([
      "severityBase",
      "emergencyModifier",
      "waitFactor",
      "agingBonus",
      "registrationVariance",
    ]);
    expect(steps.filter((s) => s.concept === "urgency")).toHaveLength(2);
    expect(steps.filter((s) => s.concept === "fairness")).toHaveLength(3);
  });
});
