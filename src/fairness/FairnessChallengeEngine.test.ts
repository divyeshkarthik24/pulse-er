import { describe, expect, it } from "vitest";
import { buildFairnessScenario } from "./FairnessChallengeEngine";
import { PriorityCalculator } from "../dsa/PriorityCalculator";
import { PriorityQueue } from "../dsa/PriorityQueue";
import { DEFAULT_WEIGHTS } from "../types";

function scoredOrder(patients: ReturnType<typeof buildFairnessScenario>, now: number) {
  const calc = new PriorityCalculator(DEFAULT_WEIGHTS);
  const queue = new PriorityQueue(calc);
  patients.forEach((p) => queue.insert(p, now));
  return queue.sortedByPriority().map((p) => p.name);
}

describe("FairnessChallengeEngine", () => {
  const now = Date.parse("2026-01-01T12:00:00Z");

  it("same-severity scenario: identical severity and variance ranks purely by arrival order", () => {
    const patients = buildFairnessScenario("same-severity", now);
    const order = scoredOrder(patients, now);
    expect(order).toEqual(["Patient A", "Patient B", "Patient C"]);
  });

  it("long-wait scenario: lucky variance initially outranks an earlier arrival, aging corrects it over time", () => {
    const patients = buildFairnessScenario("long-wait", now);
    const calc = new PriorityCalculator(DEFAULT_WEIGHTS);
    const queue = new PriorityQueue(calc);
    patients.forEach((p) => queue.insert(p, now));

    const immediateOrder = queue.sortedByPriority().map((p) => p.name);
    expect(immediateOrder[0]).toContain("lucky variance"); // B leads initially

    queue.refreshAll(now + 60 * 60000, "rescore-aging"); // advance 60 minutes
    const laterOrder = queue.sortedByPriority().map((p) => p.name);
    expect(laterOrder[0]).toContain("unlucky variance"); // A reclaims the lead via aging
  });

  it("safety-boundary scenario keeps a fresh Critical patient ahead of a long-waiting Stable one", () => {
    const patients = buildFairnessScenario("safety-boundary", now);
    const calc = new PriorityCalculator(DEFAULT_WEIGHTS);
    const queue = new PriorityQueue(calc);
    patients.forEach((p) => queue.insert(p, now));
    const order = queue.sortedByPriority();
    expect(order[0].severity).toBe(1);
    expect(calc.isStarvationSafe()).toBe(true);
  });

  it("starvation scenario produces exactly one low-severity patient to demonstrate bounded aging", () => {
    const patients = buildFairnessScenario("starvation", now);
    expect(patients).toHaveLength(1);
    expect(patients[0].severity).toBe(4);
  });
});
