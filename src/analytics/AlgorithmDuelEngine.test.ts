import { describe, expect, it } from "vitest";
import { DEFAULT_DUEL_CONFIG, generateDuelDataset, runAlgorithmDuel } from "./AlgorithmDuelEngine";
import { DEFAULT_WEIGHTS } from "../types";

describe("AlgorithmDuelEngine", () => {
  const now = Date.parse("2026-01-01T12:00:00Z");

  it("the same seed produces an identical scenario (severity, arrival order, service time, emergency flag)", () => {
    const a = generateDuelDataset(DEFAULT_DUEL_CONFIG, now);
    const b = generateDuelDataset(DEFAULT_DUEL_CONFIG, now);
    expect(a.length).toBe(b.length);
    a.forEach((pa, i) => {
      const pb = b[i];
      expect(pa.severity).toBe(pb.severity);
      expect(pa.arrivalTime).toBe(pb.arrivalTime);
      expect(pa.isEmergency).toBe(pb.isEmergency);
      expect(pa.registrationVariance).toBe(pb.registrationVariance);
      expect(pa.estimatedTreatmentMinutes).toBe(pb.estimatedTreatmentMinutes);
      expect(pa.arrivalSequence).toBe(pb.arrivalSequence);
    });
  });

  it("a different seed produces a different scenario", () => {
    const a = generateDuelDataset(DEFAULT_DUEL_CONFIG, now);
    const b = generateDuelDataset({ ...DEFAULT_DUEL_CONFIG, seed: DEFAULT_DUEL_CONFIG.seed + 1 }, now);
    const severitiesA = a.map((p) => p.severity).join(",");
    const severitiesB = b.map((p) => p.severity).join(",");
    expect(severitiesA).not.toBe(severitiesB);
  });

  it("arrival sequence is monotonic with arrival time within the generated scenario", () => {
    const dataset = generateDuelDataset(DEFAULT_DUEL_CONFIG, now);
    const sorted = [...dataset].sort((a, b) => a.arrivalTime - b.arrivalTime);
    sorted.forEach((p, i) => expect(p.arrivalSequence).toBe(i + 1));
  });

  it("all three strategies in a duel run operate on exactly the same patient set (same ids)", () => {
    const result = runAlgorithmDuel(DEFAULT_DUEL_CONFIG, DEFAULT_WEIGHTS, now);
    const idSets = result.results.map((r) => [...r.order].sort().join(","));
    expect(idSets[0]).toBe(idSets[1]);
    expect(idSets[1]).toBe(idSets[2]);
  });

  it("re-running the same config produces identical metrics (deterministic scenario, deterministic simulation)", () => {
    const first = runAlgorithmDuel(DEFAULT_DUEL_CONFIG, DEFAULT_WEIGHTS, now);
    const second = runAlgorithmDuel(DEFAULT_DUEL_CONFIG, DEFAULT_WEIGHTS, now);
    expect(first.results).toEqual(second.results);
  });
});
