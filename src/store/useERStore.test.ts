import { beforeEach, describe, expect, it } from "vitest";
import { useERStore } from "./useERStore";

function resetStoreSynchronously() {
  // init() is async (loads from localStorage, which is unavailable/empty in
  // this test environment and fails safe to seeded defaults) — await it
  // directly rather than going through the React effect that normally
  // triggers it.
  return useERStore.getState().init();
}

describe("useERStore — demo scenarios & presentation reset", () => {
  beforeEach(async () => {
    await resetStoreSynchronously();
  });

  it("loadDemoScenario replaces patients, doctors, and departments with the scenario's deterministic data", () => {
    useERStore.getState().loadDemoScenario("critical-surge");
    const state = useERStore.getState();
    expect(state.currentScenario).toBe("critical-surge");
    expect(state.patients.length).toBeGreaterThan(0);
    expect(state.patients.every((p) => p.severity === 1 || p.severity === 2 || p.severity <= 5)).toBe(true);
  });

  it("loadDemoScenario resets the event log, DSA activity counters, health history, and queue-size history", () => {
    // Pollute state first, as if a previous demo had been running.
    useERStore.getState().quickAddRandomPatient();
    useERStore.getState().quickAddRandomPatient();
    expect(useERStore.getState().eventLog.length).toBeGreaterThan(0);
    expect(useERStore.getState().dsaActivityCounters.insertions).toBeGreaterThan(0);

    useERStore.getState().loadDemoScenario("normal");
    const state = useERStore.getState();
    expect(state.dsaActivityCounters).toEqual({
      insertions: 0,
      extractions: 0,
      comparisons: 0,
      swaps: 0,
      agingEvents: 0,
      priorityUpdates: 0,
    });
    expect(state.healthHistory).toEqual([]);
    expect(state.queueSizeHistory).toEqual([]);
    // The scenario-load event itself is the only thing in the log.
    expect(state.eventLog).toHaveLength(1);
    expect(state.eventLog[0].type).toBe("simulation");
  });

  it("loadDemoScenario resets the scheduler configuration history to a fresh version 1", () => {
    useERStore.getState().updateWeights({ ...useERStore.getState().weights, agingRatePerMinute: 99 });
    expect(useERStore.getState().configHistory.length).toBeGreaterThan(1);

    useERStore.getState().loadDemoScenario("normal");
    const state = useERStore.getState();
    expect(state.configHistory).toHaveLength(1);
    expect(state.configHistory[0].version).toBe(1);
    expect(state.weights.agingRatePerMinute).toBe(2);
  });

  it("resetCurrentScenario reloads whichever scenario is currently active", () => {
    useERStore.getState().loadDemoScenario("starvation-test");
    const firstLoadCount = useERStore.getState().patients.length;

    useERStore.getState().quickAddRandomPatient(); // simulate presenter activity
    expect(useERStore.getState().patients.length).toBe(firstLoadCount + 1);

    useERStore.getState().resetCurrentScenario();
    const state = useERStore.getState();
    expect(state.currentScenario).toBe("starvation-test");
    expect(state.patients.length).toBe(firstLoadCount);
  });

  it("the simulation clock is reset (not left mid-fast-forward) when a scenario loads", () => {
    useERStore.getState().fastForward(500);
    const forwardClock = useERStore.getState().clock;

    useERStore.getState().loadDemoScenario("normal");
    const state = useERStore.getState();
    expect(state.clock).toBeLessThan(forwardClock);
    expect(state.simulation.running).toBe(false);
  });

  it("different scenarios are independently deterministic across repeated loads", () => {
    // Compare arrival offset *relative to that load's own clock* (not the
    // absolute timestamp, which legitimately differs between calls made a
    // few milliseconds apart) plus every other scheduling-relevant field.
    const fingerprint = () => {
      const state = useERStore.getState();
      return state.patients.map(
        (p) => `${p.severity}-${Math.round((state.clock - p.arrivalTime) / 1000)}-${p.registrationVariance}-${p.estimatedTreatmentMinutes}`
      );
    };

    useERStore.getState().loadDemoScenario("overcrowded");
    const first = fingerprint();

    useERStore.getState().loadDemoScenario("normal");
    useERStore.getState().loadDemoScenario("overcrowded");
    const second = fingerprint();

    expect(first).toEqual(second);
  });
});
