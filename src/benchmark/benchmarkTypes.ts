export type BenchmarkStrategyKey = "heap" | "sort" | "linear";

export const BENCHMARK_STRATEGY_LABEL: Record<BenchmarkStrategyKey, string> = {
  heap: "Binary Max Heap",
  sort: "Array + repeated sorting",
  linear: "Naive linear scan",
};

export interface BenchmarkConfig {
  datasetSizes: number[];
  repetitions: number;
  warmupRuns: number;
  strategies: BenchmarkStrategyKey[];
  pattern: "random" | "ascending" | "descending";
}

export const BENCHMARK_SIZE_OPTIONS = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000] as const;

export const DEFAULT_BENCHMARK_CONFIG: BenchmarkConfig = {
  datasetSizes: [100, 1000, 10000, 50000],
  repetitions: 3,
  warmupRuns: 1,
  strategies: ["heap", "sort", "linear"],
  pattern: "random",
};

/**
 * Above this size, the O(n^2 log n) sort-based approach and the O(n^2)
 * linear-scan approach become impractically slow (tens of seconds to
 * minutes) — not just "slower", but enough to make the tab unresponsive
 * even inside a worker. The heap strategy has no such cap since it stays
 * O(n log n) at any size. This cap is itself part of the demonstration:
 * it's the empirical consequence of the complexity difference, not an
 * arbitrary UI limitation.
 */
export const UNSAFE_STRATEGY_SIZE_CAP = 20000;

export interface TimingStats {
  avgMs: number;
  minMs: number;
  maxMs: number;
  trials: number[];
}

export interface BenchmarkResult {
  strategy: BenchmarkStrategyKey;
  datasetSize: number;
  insert: TimingStats;
  extract: TimingStats;
  comparisons: number;
  swaps: number;
  skipped: boolean;
  skipReason?: string;
}

export interface BenchmarkProgress {
  done: number;
  total: number;
  currentLabel: string;
}

export interface BenchmarkRunResponse {
  type: "progress" | "done" | "error";
  progress?: BenchmarkProgress;
  results?: BenchmarkResult[];
  error?: string;
}
