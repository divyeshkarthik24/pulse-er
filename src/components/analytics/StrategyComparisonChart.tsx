import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AlgorithmStrategyResult } from "../../types";

const STRATEGY_COLOR: Record<string, string> = {
  fifo: "var(--color-steel)",
  priority: "var(--color-amber)",
  "priority-aging": "var(--color-emerald)",
};

export function StrategyComparisonChart({ results }: { results: AlgorithmStrategyResult[] }) {
  if (results.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-[var(--color-ink-mute)]">
        Run a comparison to see FIFO vs Priority Queue vs Priority + Aging side by side.
      </div>
    );
  }

  // Keep the shared chart to same-unit (minutes) metrics only — fairness
  // variance lives on a wildly different scale (squared minutes) and would
  // flatten the others into invisibility on one axis. It's shown per-card below instead.
  const data = [
    { metric: "Avg wait (min)", ...Object.fromEntries(results.map((r) => [r.strategy, r.avgWaitMinutes])) },
    { metric: "Critical avg wait", ...Object.fromEntries(results.map((r) => [r.strategy, r.criticalAvgWaitMinutes])) },
    { metric: "Max wait (min)", ...Object.fromEntries(results.map((r) => [r.strategy, r.maxWaitMinutes])) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
            <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-line)", borderRadius: 10, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {results.map((r) => (
              <Bar key={r.strategy} dataKey={r.strategy} name={r.label} fill={STRATEGY_COLOR[r.strategy]} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {results.map((r) => (
          <div key={r.strategy} className="rounded-xl border border-[var(--color-line)] p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STRATEGY_COLOR[r.strategy] }} />
              <span className="text-xs font-semibold">{r.label}</span>
            </div>
            <div className="text-xs text-[var(--color-ink-soft)] space-y-1">
              <div className="flex justify-between"><span>Throughput</span><span className="font-mono">{r.throughputPerHour}/hr</span></div>
              <div className="flex justify-between"><span>Critical wait</span><span className="font-mono">{r.criticalAvgWaitMinutes}m</span></div>
              <div className="flex justify-between"><span>Max wait</span><span className="font-mono">{r.maxWaitMinutes}m</span></div>
              <div className="flex justify-between"><span>Fairness variance</span><span className="font-mono">{r.fairnessVariance}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
