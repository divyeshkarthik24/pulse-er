import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Cpu, Gauge, Play, Trash2 } from "lucide-react";
import { useBenchmarkStore } from "../store/useBenchmarkStore";
import { Card, SectionHeading } from "../components/common/Card";
import { Button } from "../components/common/Button";
import {
  BENCHMARK_SIZE_OPTIONS,
  BENCHMARK_STRATEGY_LABEL,
  type BenchmarkStrategyKey,
} from "../benchmark/benchmarkTypes";

const STRATEGY_COLOR: Record<BenchmarkStrategyKey, string> = {
  heap: "var(--color-emerald)",
  sort: "var(--color-amber)",
  linear: "var(--color-coral)",
};

const COMPLEXITY = [
  { strategy: "Binary Heap", insert: "O(log n)", extract: "O(log n)", peek: "O(1)" },
  { strategy: "Sorting Approach", insert: "O(n log n)", extract: "O(1)*", peek: "O(1)" },
  { strategy: "Linear Scan", insert: "O(1)", extract: "O(n)", peek: "O(n)" },
];

export function BenchmarkLabPage() {
  const { config, results, running, progress, error, setConfig, run, cancel, clear } = useBenchmarkStore();

  function toggleSize(size: number) {
    const has = config.datasetSizes.includes(size);
    setConfig({ datasetSizes: has ? config.datasetSizes.filter((s) => s !== size) : [...config.datasetSizes, size].sort((a, b) => a - b) });
  }
  function toggleStrategy(s: BenchmarkStrategyKey) {
    const has = config.strategies.includes(s);
    setConfig({ strategies: has ? config.strategies.filter((x) => x !== s) : [...config.strategies, s] });
  }

  const chartData = useMemo(() => {
    const bySize = new Map<number, Record<string, number | string>>();
    // A log-scale axis can't represent exactly 0 (log(0) is undefined) — sub-millisecond
    // operations on tiny datasets genuinely round to 0ms, so floor chart values (display
    // only; the raw table below still shows the true measured number) to a tiny epsilon.
    const CHART_EPSILON_MS = 0.001;
    results
      .filter((r) => !r.skipped)
      .forEach((r) => {
        const row = bySize.get(r.datasetSize) ?? { size: r.datasetSize };
        row[`${r.strategy}_insert`] = Math.max(r.insert.avgMs, CHART_EPSILON_MS);
        row[`${r.strategy}_extract`] = Math.max(r.extract.avgMs, CHART_EPSILON_MS);
        bySize.set(r.datasetSize, row);
      });
    return [...bySize.values()].sort((a, b) => (a.size as number) - (b.size as number));
  }, [results]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2.5">
          <Cpu className="text-[var(--color-emerald)]" /> Benchmark Lab
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">
          Real timed runs of three ways to pick "the next patient" — not theory, actual measured milliseconds.
        </p>
      </div>

      <Card>
        <SectionHeading eyebrow="Configuration" title="Benchmark setup" />
        <div className="grid md:grid-cols-2 gap-6 mb-5">
          <div>
            <div className="text-xs font-medium text-[var(--color-ink-soft)] mb-2">Dataset sizes</div>
            <div className="flex flex-wrap gap-1.5">
              {BENCHMARK_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`text-xs font-mono font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                    config.datasetSizes.includes(size)
                      ? "bg-[var(--color-emerald)] border-[var(--color-emerald)] text-white"
                      : "border-[var(--color-line)] text-[var(--color-ink-soft)]"
                  }`}
                >
                  {size.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-[var(--color-ink-soft)] mb-2">Strategies</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(BENCHMARK_STRATEGY_LABEL) as BenchmarkStrategyKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStrategy(s)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1.5"
                  style={{
                    borderColor: config.strategies.includes(s) ? STRATEGY_COLOR[s] : "var(--color-line)",
                    color: config.strategies.includes(s) ? STRATEGY_COLOR[s] : "var(--color-ink-soft)",
                    background: config.strategies.includes(s) ? `color-mix(in srgb, ${STRATEGY_COLOR[s]} 10%, transparent)` : "transparent",
                  }}
                >
                  {BENCHMARK_STRATEGY_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <Field label="Repetitions (averaged)">
            <input
              type="number"
              min={1}
              max={10}
              value={config.repetitions}
              onChange={(e) => setConfig({ repetitions: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Warm-up runs (discarded)">
            <input
              type="number"
              min={0}
              max={5}
              value={config.warmupRuns}
              onChange={(e) => setConfig({ warmupRuns: Number(e.target.value) })}
              className="input"
            />
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={run} disabled={running || config.datasetSizes.length === 0}>
            <Play size={14} /> Run Benchmark
          </Button>
          {running && (
            <Button variant="outline" size="sm" onClick={cancel}>
              Cancel
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={clear} disabled={running}>
            <Trash2 size={14} /> Clear Results
          </Button>
        </div>

        {running && progress && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-[var(--color-ink-mute)] mb-1.5">
              <span>Running: {progress.currentLabel}</span>
              <span>
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-paper-dim)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-emerald)] transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--color-ink-mute)] mt-2">
              Running in a background Web Worker — the rest of the app stays responsive.
            </p>
          </div>
        )}
        {error && <p className="text-sm text-[var(--color-coral)] mt-3">{error}</p>}
      </Card>

      {results.length > 0 && (
        <>
          <Card>
            <SectionHeading eyebrow="Measured" title="Insert runtime vs. input size" description="Log scale on both axes." />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                  <XAxis dataKey="size" scale="log" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} />
                  <YAxis scale="log" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} width={50} />
                  <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-line)", borderRadius: 10, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {config.strategies.map((s) => (
                    <Line key={s} type="monotone" dataKey={`${s}_insert`} name={BENCHMARK_STRATEGY_LABEL[s]} stroke={STRATEGY_COLOR[s]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SectionHeading eyebrow="Measured" title="Extract-max runtime vs. input size" description="Log scale on both axes." />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                  <XAxis dataKey="size" scale="log" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} />
                  <YAxis scale="log" domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} width={50} />
                  <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-line)", borderRadius: 10, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {config.strategies.map((s) => (
                    <Line key={s} type="monotone" dataKey={`${s}_extract`} name={BENCHMARK_STRATEGY_LABEL[s]} stroke={STRATEGY_COLOR[s]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SectionHeading eyebrow="Raw numbers" title="Comparison table" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-ink-mute)] border-b border-[var(--color-line)]">
                    <th className="py-2 pr-4">Dataset</th>
                    <th className="py-2 pr-4">Strategy</th>
                    <th className="py-2 pr-4">Insert (avg)</th>
                    <th className="py-2 pr-4">Extract (avg)</th>
                    <th className="py-2 pr-4">Comparisons</th>
                    <th className="py-2 pr-4">Swaps</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--color-line-soft)]">
                      <td className="py-2 pr-4 font-mono">{r.datasetSize.toLocaleString()}</td>
                      <td className="py-2 pr-4" style={{ color: STRATEGY_COLOR[r.strategy] }}>
                        {BENCHMARK_STRATEGY_LABEL[r.strategy]}
                      </td>
                      {r.skipped ? (
                        <td colSpan={4} className="py-2 text-xs text-[var(--color-ink-mute)] italic">
                          {r.skipReason}
                        </td>
                      ) : (
                        <>
                          <td className="py-2 pr-4 font-mono">{r.insert.avgMs}ms</td>
                          <td className="py-2 pr-4 font-mono">{r.extract.avgMs}ms</td>
                          <td className="py-2 pr-4 font-mono">{r.comparisons.toLocaleString()}</td>
                          <td className="py-2 pr-4 font-mono">{r.swaps.toLocaleString()}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Card>
        <SectionHeading eyebrow="Theory vs. measurement" title="Complexity panel" icon={<Gauge size={18} />} />
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-ink-mute)] border-b border-[var(--color-line)]">
                <th className="py-2 pr-4">Approach</th>
                <th className="py-2 pr-4">Insert</th>
                <th className="py-2 pr-4">Extract-max</th>
                <th className="py-2 pr-4">Peek</th>
              </tr>
            </thead>
            <tbody>
              {COMPLEXITY.map((row) => (
                <tr key={row.strategy} className="border-b border-[var(--color-line-soft)]">
                  <td className="py-2 pr-4 font-medium">{row.strategy}</td>
                  <td className="py-2 pr-4 font-mono text-[var(--color-emerald)]">{row.insert}</td>
                  <td className="py-2 pr-4 font-mono text-[var(--color-emerald)]">{row.extract}</td>
                  <td className="py-2 pr-4 font-mono text-[var(--color-emerald)]">{row.peek}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--color-ink-mute)] leading-relaxed">
          * The sorting approach's extract is O(1) only because it already paid for a full re-sort on every insert —
          the cost didn't disappear, it moved. Measured timings above will vary run to run with CPU load, browser,
          and JIT warm-up; asymptotic complexity describes how runtime <em>grows</em> as input size grows, not a
          guarantee about any single measurement. A noisy one-off number is not proof of anything — that's why this
          lab averages multiple repetitions after discarding warm-up runs.
        </p>
      </Card>
      <style>{`.input { border:1px solid var(--color-line); background:var(--color-surface-raised); border-radius:10px; padding:8px 12px; font-size:14px; width:100%; outline:none; } .input:focus { border-color: var(--color-emerald); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
