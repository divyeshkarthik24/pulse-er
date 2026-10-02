import { describe, expect, it } from "vitest";
import { createReplayEngine } from "./QueueReplayEngine";
import { DEFAULT_WEIGHTS, type EventLogEntry, type Patient, type SchedulerConfigVersion, type SchedulerWeights } from "../types";
import { TriageEngine } from "../dsa/TriageEngine";
import { randomVitals } from "../data/randomPatient";

const triageEngine = new TriageEngine();

function mkPatient(id: string, severity: 1 | 2 | 3 | 4 | 5, arrivalTime: number, assignedAt?: number): Patient {
  const p = triageEngine.createPatient({
    name: id,
    age: 40,
    gender: "Other",
    symptoms: ["test"],
    severity,
    vitals: randomVitals(severity),
    isEmergency: false,
    arrivalTime,
  });
  p.id = id;
  p.status = assignedAt ? "assigned" : "queued";
  p.queuedAt = arrivalTime;
  p.assignedAt = assignedAt;
  return p;
}

function mkEvent(id: string, timestamp: number, configVersion: number): EventLogEntry {
  return { id, type: "arrival", timestamp, configVersion, message: id };
}

describe("QueueReplayEngine", () => {
  const t0 = 1_000_000;
  const engine = createReplayEngine();

  it("reconstructs who was waiting at a given instant from real timestamps, not a stored snapshot", () => {
    const patients: Patient[] = [
      mkPatient("P1", 3, t0), // never assigned — still waiting "now"
      mkPatient("P2", 3, t0 + 1000, t0 + 5000), // was waiting from t0+1000 to t0+5000, then assigned
    ];

    const waitingBeforeAssignment = engine.reconstructWaitingQueueAt(patients, t0 + 3000, DEFAULT_WEIGHTS);
    expect(waitingBeforeAssignment.map((p) => p.id).sort()).toEqual(["P1", "P2"]);

    const waitingAfterAssignment = engine.reconstructWaitingQueueAt(patients, t0 + 6000, DEFAULT_WEIGHTS);
    expect(waitingAfterAssignment.map((p) => p.id)).toEqual(["P1"]);
  });

  it("excludes a patient entirely before they arrive", () => {
    const patients: Patient[] = [mkPatient("P1", 3, t0 + 10000)];
    const waiting = engine.reconstructWaitingQueueAt(patients, t0, DEFAULT_WEIGHTS);
    expect(waiting).toHaveLength(0);
  });

  it("orders the reconstructed queue by effective priority at that instant, highest first", () => {
    const patients: Patient[] = [mkPatient("LOW", 5, t0), mkPatient("HIGH", 1, t0)];
    const waiting = engine.reconstructWaitingQueueAt(patients, t0 + 1000, DEFAULT_WEIGHTS);
    expect(waiting[0].id).toBe("HIGH");
  });

  it("defaults to DEFAULT_WEIGHTS when no weights are supplied", () => {
    const patients: Patient[] = [mkPatient("P1", 3, t0)];
    const waiting = engine.reconstructWaitingQueueAt(patients, t0 + 1000);
    expect(waiting).toHaveLength(1);
  });

  it("buildHeapArray produces a structurally valid heap for the reconstructed queue", () => {
    const patients: Patient[] = [mkPatient("A", 3, t0), mkPatient("B", 1, t0), mkPatient("C", 4, t0)];
    const waiting = engine.reconstructWaitingQueueAt(patients, t0 + 1000, DEFAULT_WEIGHTS);
    const heapArray = engine.buildHeapArray(waiting);
    expect(heapArray[0].id).toBe("B"); // critical should be at the root
  });

  describe("resolveConfig", () => {
    const history: SchedulerConfigVersion[] = [
      { version: 1, weights: DEFAULT_WEIGHTS, activatedAt: t0 },
      { version: 2, weights: { ...DEFAULT_WEIGHTS, agingRatePerMinute: 10 }, activatedAt: t0 + 10000 },
    ];

    it("finds the exact version requested", () => {
      expect(engine.resolveConfig(history, 2).weights.agingRatePerMinute).toBe(10);
      expect(engine.resolveConfig(history, 1).weights.agingRatePerMinute).toBe(DEFAULT_WEIGHTS.agingRatePerMinute);
    });

    it("falls back to the latest version at-or-before an unknown version number", () => {
      expect(engine.resolveConfig(history, 5).version).toBe(2);
    });

    it("falls back to the first entry if the requested version predates all history", () => {
      expect(engine.resolveConfig(history, 0).version).toBe(1);
    });

    it("falls back to defaults when history is empty", () => {
      expect(engine.resolveConfig([], 1).weights).toEqual(DEFAULT_WEIGHTS);
    });
  });

  describe("configVersion-aware buildFrame — historical correctness", () => {
    // Scenario from the spec: config A, some events, config change, more events,
    // then replay both sides of the change and confirm each used its own config.
    const configA: SchedulerWeights = { ...DEFAULT_WEIGHTS, agingRatePerMinute: 2, agingThresholdMinutes: 20 };
    const configB: SchedulerWeights = { ...DEFAULT_WEIGHTS, agingRatePerMinute: 10, agingThresholdMinutes: 5 };
    const configHistory: SchedulerConfigVersion[] = [
      { version: 1, weights: configA, activatedAt: t0 },
      { version: 2, weights: configB, activatedAt: t0 + 50 * 60000 },
    ];

    // One patient, waiting the whole time, observed once under each config.
    const patient = mkPatient("P1", 3, t0);
    const events: EventLogEntry[] = [
      mkEvent("before", t0 + 30 * 60000, 1), // 30 min wait, under config A (threshold 20, rate 2)
      mkEvent("after", t0 + 80 * 60000, 2), // 80 min wait, under config B (threshold 5, rate 10)
    ];

    it("replaying the event before the settings change uses configuration A", () => {
      const frame = engine.buildFrame([patient], events, 0, configHistory);
      expect(frame.config.version).toBe(1);
      // 30 min wait, 20 min threshold, rate 2 -> aging = (30-20)*2 = 20
      expect(frame.waitingQueue[0].priorityBreakdown.agingBonus).toBeCloseTo(20, 1);
    });

    it("replaying the event after the settings change uses configuration B", () => {
      const frame = engine.buildFrame([patient], events, 1, configHistory);
      expect(frame.config.version).toBe(2);
      // 80 min wait, 5 min threshold, rate 10 -> aging = (80-5)*10 = 750, capped at configB's agingCap (120)
      expect(frame.waitingQueue[0].priorityBreakdown.agingBonus).toBeCloseTo(configB.agingCap, 1);
    });

    it("historical ordering is internally consistent: replaying twice gives the same result", () => {
      const first = engine.buildFrame([patient], events, 0, configHistory);
      const second = engine.buildFrame([patient], events, 0, configHistory);
      expect(first.waitingQueue[0].priorityScore).toBe(second.waitingQueue[0].priorityScore);
    });
  });

  it("buildFrame clamps out-of-range indices and returns the correct event", () => {
    const events: EventLogEntry[] = [mkEvent("e1", t0, 1), mkEvent("e2", t0 + 1000, 1)];
    const configHistory: SchedulerConfigVersion[] = [{ version: 1, weights: DEFAULT_WEIGHTS, activatedAt: t0 }];
    const frame = engine.buildFrame([], events, 99, configHistory);
    expect(frame.eventIndex).toBe(1);
    expect(frame.event.id).toBe("e2");
  });
});
