import { runBenchmarkSync } from "./BenchmarkEngine";
import type { BenchmarkConfig, BenchmarkRunResponse } from "./benchmarkTypes";

/**
 * Runs the (potentially slow — that's the point for sort/linear at large
 * N) benchmark off the main thread, so the UI stays responsive and the
 * rest of the app keeps animating while large datasets are tested.
 */
self.onmessage = (e: MessageEvent<{ config: BenchmarkConfig }>) => {
  try {
    const results = runBenchmarkSync(e.data.config, (progress) => {
      const msg: BenchmarkRunResponse = { type: "progress", progress };
      (self as unknown as Worker).postMessage(msg);
    });
    const done: BenchmarkRunResponse = { type: "done", results };
    (self as unknown as Worker).postMessage(done);
  } catch (err) {
    const msg: BenchmarkRunResponse = { type: "error", error: err instanceof Error ? err.message : String(err) };
    (self as unknown as Worker).postMessage(msg);
  }
};
