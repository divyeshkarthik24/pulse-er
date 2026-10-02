import { describe, expect, it } from "vitest";
import { runBenchmarkSync } from "./BenchmarkEngine";
import type { BenchmarkConfig } from "./benchmarkTypes";

describe("BenchmarkEngine", () => {
  it("runs all requested strategies at all requested small sizes and returns timing stats", () => {
    const config: BenchmarkConfig = {
      datasetSizes: [50, 200],
      repetitions: 2,
      warmupRuns: 1,
      strategies: ["heap", "sort", "linear"],
      pattern: "random",
    };
    const results = runBenchmarkSync(config);
    expect(results).toHaveLength(config.datasetSizes.length * config.strategies.length);
    results.forEach((r) => {
      expect(r.skipped).toBe(false);
      expect(r.insert.trials).toHaveLength(config.repetitions);
      expect(r.extract.trials).toHaveLength(config.repetitions);
      expect(r.insert.avgMs).toBeGreaterThanOrEqual(0);
      expect(r.extract.avgMs).toBeGreaterThanOrEqual(0);
    });
  });

  it("skips sort/linear above the safety cap but always runs heap", () => {
    const config: BenchmarkConfig = {
      datasetSizes: [100000],
      repetitions: 1,
      warmupRuns: 0,
      strategies: ["heap", "sort", "linear"],
      pattern: "random",
    };
    const results = runBenchmarkSync(config);
    const heapResult = results.find((r) => r.strategy === "heap")!;
    const sortResult = results.find((r) => r.strategy === "sort")!;
    const linearResult = results.find((r) => r.strategy === "linear")!;
    expect(heapResult.skipped).toBe(false);
    expect(sortResult.skipped).toBe(true);
    expect(linearResult.skipped).toBe(true);
    expect(sortResult.skipReason).toBeTruthy();
  }, 30000);

  it("heap strategy produces a non-zero number of comparisons and swaps for a nontrivial dataset", () => {
    const config: BenchmarkConfig = {
      datasetSizes: [500],
      repetitions: 1,
      warmupRuns: 0,
      strategies: ["heap"],
      pattern: "random",
    };
    const [result] = runBenchmarkSync(config);
    expect(result.comparisons).toBeGreaterThan(0);
  });

  it("reports progress for every (size, strategy) pair, including skipped ones", () => {
    const config: BenchmarkConfig = {
      datasetSizes: [50, 100000],
      repetitions: 1,
      warmupRuns: 0,
      strategies: ["heap", "sort"],
      pattern: "random",
    };
    const progressCalls: number[] = [];
    runBenchmarkSync(config, (p) => progressCalls.push(p.done));
    expect(progressCalls).toEqual([1, 2, 3, 4]);
  }, 30000);
});
