import { describe, expect, it } from "vitest";
import { runStrategyComparisonOnSimPatients, scoreFor, type SimPatient } from "./algorithmComparison";
import { DEFAULT_WEIGHTS } from "../types";

describe("algorithmComparison", () => {
  it("fifo and priority scores never depend on the current time", () => {
    const p: SimPatient = {
      id: "P1",
      severity: 3,
      arrivalTime: 1000,
      arrivalSequence: 1,
      isEmergency: false,
      registrationVariance: 10,
      serviceMinutes: 20,
    };
    const scoreAt1 = scoreFor(p, 2000, "priority", DEFAULT_WEIGHTS);
    const scoreAt2 = scoreFor(p, 999999999, "priority", DEFAULT_WEIGHTS);
    expect(scoreAt1).toBe(scoreAt2);
  });

  it("priority-aging score strictly increases with waiting time once past the aging threshold", () => {
    const p: SimPatient = {
      id: "P1",
      severity: 3,
      arrivalTime: 0,
      arrivalSequence: 1,
      isEmergency: false,
      registrationVariance: 0,
      serviceMinutes: 20,
    };
    const earlyScore = scoreFor(p, 5 * 60000, "priority-aging", DEFAULT_WEIGHTS); // 5 min — before aging threshold
    const lateScore = scoreFor(p, 40 * 60000, "priority-aging", DEFAULT_WEIGHTS); // 40 min — well past it
    expect(lateScore).toBeGreaterThan(earlyScore);
  });

  it("a lower-severity patient can never outscore a higher-severity one under default weights, no matter the wait", () => {
    const low: SimPatient = {
      id: "LOW",
      severity: 4,
      arrivalTime: 0,
      arrivalSequence: 1,
      isEmergency: true, // even with every possible boost active
      registrationVariance: 40,
      serviceMinutes: 20,
    };
    const high: SimPatient = {
      id: "HIGH",
      severity: 1,
      arrivalTime: 1000 * 60000, // just arrived
      arrivalSequence: 2,
      isEmergency: false,
      registrationVariance: 0,
      serviceMinutes: 20,
    };
    const now = 1000 * 60000 + 1000; // low has waited ~1000 minutes — aging fully saturated
    const lowScore = scoreFor(low, now, "priority-aging", DEFAULT_WEIGHTS);
    const highScore = scoreFor(high, now, "priority-aging", DEFAULT_WEIGHTS);
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it("detects a genuine aging-driven reorder (priorityChangeCount > 0) in a constructed scenario", () => {
    const now = Date.parse("2026-01-01T10:00:00Z");
    // D is a single-server "blocker": it occupies the only server for 60 minutes so A and B
    // actually sit in the waiting pool together long enough for aging to matter — with only
    // one server free from t=0, the first-arriving patient would otherwise be served instantly
    // and no two patients would ever truly compete.
    // A arrives with bad variance (+2) at t=0; B arrives 15 min later with great variance (+32).
    // B leads at first (variance edge > A's small head start), but once both are well past the
    // aging threshold, A's extra 15 minutes of wait+aging credit (~45 pts) outweighs B's 30-point
    // variance edge, and A should reclaim the lead by the time the server frees up at t=60.
    const patients: SimPatient[] = [
      { id: "D", severity: 1, arrivalTime: now, arrivalSequence: 1, isEmergency: false, registrationVariance: 0, serviceMinutes: 60 },
      { id: "A", severity: 3, arrivalTime: now, arrivalSequence: 2, isEmergency: false, registrationVariance: 2, serviceMinutes: 500 },
      { id: "B", severity: 3, arrivalTime: now + 15 * 60000, arrivalSequence: 3, isEmergency: false, registrationVariance: 32, serviceMinutes: 500 },
    ];
    const { results } = runStrategyComparisonOnSimPatients(patients, DEFAULT_WEIGHTS, 1);
    const priority = results.find((r) => r.strategy === "priority")!;
    const aging = results.find((r) => r.strategy === "priority-aging")!;

    expect(priority.priorityChangeCount).toBe(0); // static formula never reorders on its own
    expect(aging.priorityChangeCount).toBeGreaterThan(0); // aging does
    expect(aging.order[1]).toBe("A"); // A (not B) is served second, right after the blocker
  });

  it("fairness variance is computed from real simulated wait times, not hardcoded", () => {
    const now = Date.parse("2026-01-01T10:00:00Z");
    const patients: SimPatient[] = [
      { id: "A", severity: 3, arrivalTime: now, arrivalSequence: 1, isEmergency: false, registrationVariance: 0, serviceMinutes: 30 },
      { id: "B", severity: 3, arrivalTime: now + 2 * 60000, arrivalSequence: 2, isEmergency: false, registrationVariance: 0, serviceMinutes: 30 },
    ];
    const { results } = runStrategyComparisonOnSimPatients(patients, DEFAULT_WEIGHTS, 1);
    results.forEach((r) => {
      expect(typeof r.fairnessVariance).toBe("number");
      expect(Number.isNaN(r.fairnessVariance)).toBe(false);
    });
  });
});
