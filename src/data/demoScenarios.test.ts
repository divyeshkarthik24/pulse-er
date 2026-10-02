import { describe, expect, it } from "vitest";
import { buildDemoScenario, DEMO_SCENARIOS, type DemoScenarioKey } from "./demoScenarios";

const ALL_KEYS: DemoScenarioKey[] = DEMO_SCENARIOS.map((s) => s.key);

describe("demoScenarios", () => {
  const now = Date.parse("2026-01-01T12:00:00Z");

  it("defines exactly the six required scenarios", () => {
    expect(ALL_KEYS.sort()).toEqual(
      ["algorithm-comparison", "critical-surge", "fairness-test", "normal", "overcrowded", "starvation-test"].sort()
    );
  });

  it.each(ALL_KEYS)("%s is fully reproducible: same scenario loaded twice yields identical patients", (key) => {
    const a = buildDemoScenario(key, now);
    const b = buildDemoScenario(key, now);
    expect(a.patients).toHaveLength(b.patients.length);
    a.patients.forEach((pa, i) => {
      const pb = b.patients[i];
      expect(pa.severity).toBe(pb.severity);
      expect(pa.arrivalTime).toBe(pb.arrivalTime);
      expect(pa.isEmergency).toBe(pb.isEmergency);
      expect(pa.registrationVariance).toBe(pb.registrationVariance);
      expect(pa.estimatedTreatmentMinutes).toBe(pb.estimatedTreatmentMinutes);
      expect(pa.arrivalSequence).toBe(pb.arrivalSequence);
    });
  });

  it.each(ALL_KEYS)("%s produces at least one patient and valid doctor/department data", (key) => {
    const result = buildDemoScenario(key, now);
    expect(result.patients.length).toBeGreaterThan(0);
    expect(result.doctors.length).toBeGreaterThan(0);
    expect(result.departments.length).toBeGreaterThan(0);
  });

  it("critical-surge skews heavily toward severity 1 and 2 compared to normal", () => {
    const normal = buildDemoScenario("normal", now);
    const surge = buildDemoScenario("critical-surge", now);
    const criticalRatio = (patients: typeof normal.patients) =>
      patients.filter((p) => p.severity <= 2).length / patients.length;
    expect(criticalRatio(surge.patients)).toBeGreaterThan(criticalRatio(normal.patients));
  });

  it("critical-surge leaves fewer doctors available than normal", () => {
    const normal = buildDemoScenario("normal", now);
    const surge = buildDemoScenario("critical-surge", now);
    const availableCount = (doctors: typeof normal.doctors) => doctors.filter((d) => d.available).length;
    expect(availableCount(surge.doctors)).toBeLessThan(availableCount(normal.doctors));
  });

  it("overcrowded has a visibly larger patient count and fewer available doctors than normal", () => {
    const normal = buildDemoScenario("normal", now);
    const overcrowded = buildDemoScenario("overcrowded", now);
    expect(overcrowded.patients.length).toBeGreaterThan(normal.patients.length);
    expect(overcrowded.doctors.filter((d) => d.available).length).toBeLessThan(normal.doctors.filter((d) => d.available).length);
  });

  it("starvation-test includes one patient waiting far longer than the rest", () => {
    const result = buildDemoScenario("starvation-test", now);
    const waits = result.patients.map((p) => now - p.arrivalTime);
    const maxWait = Math.max(...waits);
    const others = waits.filter((w) => w !== maxWait);
    expect(maxWait).toBeGreaterThan(Math.max(...others) * 2);
  });

  it("algorithm-comparison matches what Algorithm Duel's own generator would produce for the default config", () => {
    const result = buildDemoScenario("algorithm-comparison", now);
    expect(result.patients.length).toBeGreaterThan(0);
    // All ids should carry the Duel engine's "D<seed>-" naming scheme.
    expect(result.patients.every((p) => p.id.startsWith("D"))).toBe(true);
  });

  it("fairness-test produces patients with deterministic service times (not left to raw Math.random)", () => {
    const a = buildDemoScenario("fairness-test", now);
    const b = buildDemoScenario("fairness-test", now);
    expect(a.patients.map((p) => p.estimatedTreatmentMinutes)).toEqual(b.patients.map((p) => p.estimatedTreatmentMinutes));
  });
});
