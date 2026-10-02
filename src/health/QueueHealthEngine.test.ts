import { describe, expect, it } from "vitest";
import { computeQueueHealth } from "./QueueHealthEngine";
import type { QueueHealthInput } from "./queueHealthTypes";

function baseInput(overrides: Partial<QueueHealthInput> = {}): QueueHealthInput {
  return {
    queueSize: 2,
    criticalWaiting: 0,
    criticalWaitMinutesList: [],
    avgWaitMinutes: 5,
    maxWaitMinutes: 10,
    waitTimesBySeverity: [[], [], [5], [5], []],
    doctorsAvailable: 4,
    doctorsTotal: 6,
    roomsAvailable: 4,
    roomsTotal: 6,
    queueSizeNowVsWindow: undefined,
    heapSize: 2,
    highestPriority: 1200,
    avgEffectivePriority: 1000,
    ...overrides,
  };
}

describe("QueueHealthEngine", () => {
  it("a quiet, well-staffed queue scores high and lands in a healthy/optimal state", () => {
    const health = computeQueueHealth(baseInput());
    expect(health.score).toBeGreaterThanOrEqual(75);
    expect(["optimal", "healthy"]).toContain(health.state);
  });

  it("a large queue, long critical waits, and no doctors scores much lower", () => {
    const good = computeQueueHealth(baseInput());
    const bad = computeQueueHealth(
      baseInput({
        queueSize: 40,
        criticalWaiting: 3,
        criticalWaitMinutesList: [25, 30, 40],
        avgWaitMinutes: 90,
        maxWaitMinutes: 180,
        doctorsAvailable: 0,
        roomsAvailable: 0,
      })
    );
    expect(bad.score).toBeLessThan(good.score);
    expect(bad.state === "congested" || bad.state === "critical").toBe(true);
  });

  it("score is clamped to [0, 100]", () => {
    const extreme = computeQueueHealth(
      baseInput({
        queueSize: 10000,
        criticalWaitMinutesList: [10000],
        avgWaitMinutes: 10000,
        maxWaitMinutes: 10000,
        doctorsAvailable: 0,
        doctorsTotal: 1,
        roomsAvailable: 0,
        roomsTotal: 1,
      })
    );
    expect(extreme.score).toBeGreaterThanOrEqual(0);
    expect(extreme.score).toBeLessThanOrEqual(100);
  });

  it("fires a critical-wait alert when a critical patient exceeds the configured threshold", () => {
    const health = computeQueueHealth(baseInput({ criticalWaiting: 1, criticalWaitMinutesList: [20] }));
    expect(health.alerts.some((a) => a.key === "critical-wait")).toBe(true);
  });

  it("fires a capacity alert when no doctors or rooms are available", () => {
    const health = computeQueueHealth(baseInput({ doctorsAvailable: 0, roomsAvailable: 0 }));
    expect(health.alerts.some((a) => a.key === "capacity")).toBe(true);
  });

  it("fires a rapid-growth alert when the queue grew sharply over the comparison window", () => {
    const health = computeQueueHealth(baseInput({ queueSizeNowVsWindow: { now: 20, past: 5 } }));
    expect(health.alerts.some((a) => a.key === "rapid-growth")).toBe(true);
  });

  it("does not fire a rapid-growth alert when the queue is shrinking", () => {
    const health = computeQueueHealth(baseInput({ queueSizeNowVsWindow: { now: 5, past: 20 } }));
    expect(health.alerts.some((a) => a.key === "rapid-growth")).toBe(false);
  });

  it("every weighted sub-score breakdown value is between 0 and 100", () => {
    const health = computeQueueHealth(baseInput());
    Object.values(health.breakdown).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  it("exposes the real DSA connection numbers it was given, not placeholders", () => {
    const health = computeQueueHealth(baseInput({ heapSize: 7, highestPriority: 1987.4, criticalWaiting: 2 }));
    expect(health.dsa.heapSize).toBe(7);
    expect(health.dsa.highestPriority).toBe(1987);
    expect(health.dsa.criticalWaiting).toBe(2);
  });
});
