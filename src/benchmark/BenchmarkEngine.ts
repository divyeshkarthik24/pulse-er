import {
  BENCHMARK_STRATEGY_LABEL,
  UNSAFE_STRATEGY_SIZE_CAP,
  type BenchmarkConfig,
  type BenchmarkProgress,
  type BenchmarkResult,
  type BenchmarkStrategyKey,
  type TimingStats,
} from "./benchmarkTypes";

/**
 * Minimal, allocation-light implementations used purely for timing —
 * deliberately separate from the app's `MaxHeap` (which logs every
 * compare/swap for the Heap Stepper's benefit). That bookkeeping would
 * distort a timing benchmark, so this file re-implements the same three
 * conceptual strategies with only a comparison/swap *counter*, no log.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateDataset(size: number, pattern: BenchmarkConfig["pattern"], seed: number): number[] {
  if (pattern === "ascending") return Array.from({ length: size }, (_, i) => i);
  if (pattern === "descending") return Array.from({ length: size }, (_, i) => size - i);
  const rand = mulberry32(seed);
  return Array.from({ length: size }, () => Math.floor(rand() * size * 10));
}

interface Counters {
  comparisons: number;
  swaps: number;
}

// --- Strategy 1: Binary Max Heap (array-backed, O(log n) insert/extract) ---
class BenchHeap {
  private items: number[] = [];
  private counters: Counters;
  constructor(counters: Counters) {
    this.counters = counters;
  }

  insert(value: number) {
    this.items.push(value);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      this.counters.comparisons++;
      if (this.items[i] > this.items[parent]) {
        this.counters.swaps++;
        [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
        i = parent;
      } else break;
    }
  }

  extractMax(): number | undefined {
    if (this.items.length === 0) return undefined;
    const max = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      const n = this.items.length;
      while (true) {
        const l = i * 2 + 1;
        const r = i * 2 + 2;
        let largest = i;
        if (l < n) {
          this.counters.comparisons++;
          if (this.items[l] > this.items[largest]) largest = l;
        }
        if (r < n) {
          this.counters.comparisons++;
          if (this.items[r] > this.items[largest]) largest = r;
        }
        if (largest === i) break;
        this.counters.swaps++;
        [this.items[i], this.items[largest]] = [this.items[largest], this.items[i]];
        i = largest;
      }
    }
    return max;
  }
}

/** Strategy 2: array kept sorted ascending — insert pays the sort, extract is O(1) off the end. */
function sortBasedInsertAll(values: number[], counters: Counters): number[] {
  const arr: number[] = [];
  for (const v of values) {
    arr.push(v);
    // A real re-sort, not an insertion-point search — this is the whole point: resorting from scratch every time.
    arr.sort((a, b) => {
      counters.comparisons++;
      return a - b;
    });
  }
  return arr;
}
function sortBasedExtractAll(arr: number[], count: number, counters: Counters) {
  for (let i = 0; i < count && arr.length > 0; i++) {
    arr.pop();
    counters.swaps++; // counts the removal as one structural operation
  }
}

/** Strategy 3: unsorted array — insert is trivial, extract is a full linear scan for the max. */
function linearInsertAll(values: number[]): number[] {
  return [...values];
}
function linearExtractAll(arr: number[], count: number, counters: Counters) {
  for (let i = 0; i < count && arr.length > 0; i++) {
    let maxIdx = 0;
    for (let j = 1; j < arr.length; j++) {
      counters.comparisons++;
      if (arr[j] > arr[maxIdx]) maxIdx = j;
    }
    arr.splice(maxIdx, 1);
    counters.swaps++;
  }
}

function stats(trials: number[]): TimingStats {
  return {
    avgMs: Math.round((trials.reduce((a, b) => a + b, 0) / trials.length) * 1000) / 1000,
    minMs: Math.round(Math.min(...trials) * 1000) / 1000,
    maxMs: Math.round(Math.max(...trials) * 1000) / 1000,
    trials,
  };
}

function runOneTrial(strategy: BenchmarkStrategyKey, dataset: number[]): { insertMs: number; extractMs: number; counters: Counters } {
  const counters: Counters = { comparisons: 0, swaps: 0 };

  if (strategy === "heap") {
    const heap = new BenchHeap(counters);
    const t0 = performance.now();
    for (const v of dataset) heap.insert(v);
    const t1 = performance.now();
    for (let i = 0; i < dataset.length; i++) heap.extractMax();
    const t2 = performance.now();
    return { insertMs: t1 - t0, extractMs: t2 - t1, counters };
  }

  if (strategy === "sort") {
    const t0 = performance.now();
    const arr = sortBasedInsertAll(dataset, counters);
    const t1 = performance.now();
    sortBasedExtractAll(arr, dataset.length, counters);
    const t2 = performance.now();
    return { insertMs: t1 - t0, extractMs: t2 - t1, counters };
  }

  // linear
  const t0 = performance.now();
  const arr = linearInsertAll(dataset);
  const t1 = performance.now();
  linearExtractAll(arr, dataset.length, counters);
  const t2 = performance.now();
  return { insertMs: t1 - t0, extractMs: t2 - t1, counters };
}

function skipReasonFor(strategy: BenchmarkStrategyKey, size: number): string | undefined {
  if (strategy !== "heap" && size > UNSAFE_STRATEGY_SIZE_CAP) {
    return `${BENCHMARK_STRATEGY_LABEL[strategy]} is skipped above ${UNSAFE_STRATEGY_SIZE_CAP.toLocaleString()} items — its own complexity makes it impractically slow here, which is the point being demonstrated.`;
  }
  return undefined;
}

export function runBenchmarkSync(config: BenchmarkConfig, onProgress?: (p: BenchmarkProgress) => void): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const total = config.datasetSizes.length * config.strategies.length;
  let done = 0;

  for (const size of config.datasetSizes) {
    for (const strategy of config.strategies) {
      const label = `${BENCHMARK_STRATEGY_LABEL[strategy]} @ ${size.toLocaleString()}`;
      const skipReason = skipReasonFor(strategy, size);
      if (skipReason) {
        results.push({
          strategy,
          datasetSize: size,
          insert: stats([0]),
          extract: stats([0]),
          comparisons: 0,
          swaps: 0,
          skipped: true,
          skipReason,
        });
        done++;
        onProgress?.({ done, total, currentLabel: `${label} (skipped)` });
        continue;
      }

      const dataset = generateDataset(size, config.pattern, size + strategy.length);
      for (let i = 0; i < config.warmupRuns; i++) runOneTrial(strategy, dataset);

      const insertTrials: number[] = [];
      const extractTrials: number[] = [];
      let lastCounters: Counters = { comparisons: 0, swaps: 0 };
      for (let r = 0; r < config.repetitions; r++) {
        const { insertMs, extractMs, counters } = runOneTrial(strategy, dataset);
        insertTrials.push(insertMs);
        extractTrials.push(extractMs);
        lastCounters = counters;
      }

      results.push({
        strategy,
        datasetSize: size,
        insert: stats(insertTrials),
        extract: stats(extractTrials),
        comparisons: lastCounters.comparisons,
        swaps: lastCounters.swaps,
        skipped: false,
      });
      done++;
      onProgress?.({ done, total, currentLabel: label });
    }
  }

  return results;
}
