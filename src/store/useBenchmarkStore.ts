import { create } from "zustand";
import {
  DEFAULT_BENCHMARK_CONFIG,
  type BenchmarkConfig,
  type BenchmarkProgress,
  type BenchmarkResult,
  type BenchmarkRunResponse,
} from "../benchmark/benchmarkTypes";

interface BenchmarkState {
  config: BenchmarkConfig;
  results: BenchmarkResult[];
  running: boolean;
  progress?: BenchmarkProgress;
  error?: string;

  setConfig: (patch: Partial<BenchmarkConfig>) => void;
  run: () => void;
  cancel: () => void;
  clear: () => void;
}

let worker: Worker | undefined;

export const useBenchmarkStore = create<BenchmarkState>((set, get) => ({
  config: DEFAULT_BENCHMARK_CONFIG,
  results: [],
  running: false,

  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  run: () => {
    if (get().running) return;
    worker?.terminate();
    worker = new Worker(new URL("../benchmark/benchmark.worker.ts", import.meta.url), { type: "module" });
    set({ running: true, error: undefined, progress: undefined });

    worker.onmessage = (e: MessageEvent<BenchmarkRunResponse>) => {
      const msg = e.data;
      if (msg.type === "progress") {
        set({ progress: msg.progress });
      } else if (msg.type === "done") {
        set({ running: false, results: msg.results ?? [], progress: undefined });
        worker?.terminate();
        worker = undefined;
      } else if (msg.type === "error") {
        set({ running: false, error: msg.error, progress: undefined });
        worker?.terminate();
        worker = undefined;
      }
    };
    worker.onerror = (e) => {
      set({ running: false, error: e.message, progress: undefined });
      worker?.terminate();
      worker = undefined;
    };
    worker.postMessage({ config: get().config });
  },

  cancel: () => {
    worker?.terminate();
    worker = undefined;
    set({ running: false, progress: undefined });
  },

  clear: () => set({ results: [], error: undefined }),
}));
