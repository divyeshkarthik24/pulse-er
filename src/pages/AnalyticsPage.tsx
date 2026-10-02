import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, GitCompareArrows } from "lucide-react";
import { useERStore } from "../store/useERStore";
import { Card, SectionHeading } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { statsEngine } from "../store/engineInstances";
import { runStrategyComparison } from "../analytics/algorithmComparison";
import { buildComparisonBenchmark } from "../analytics/comparisonBenchmark";
import { StrategyComparisonChart } from "../components/analytics/StrategyComparisonChart";
import { SEVERITY_META, type SeverityLevel } from "../types";
import type { AlgorithmStrategyResult } from "../types";

export function AnalyticsPage() {
  const patients = useERStore((s) => s.patients);
  const treatmentRecords = useERStore((s) => s.treatmentRecords);
  const doctors = useERStore((s) => s.doctors);
  const weights = useERStore((s) => s.weights);

  const [comparison, setComparison] = useState<AlgorithmStrategyResult[]>([]);

  const arrivals = useMemo(() => statsEngine.arrivalsOverTime(patients, 15), [patients]);
  const waitBySeverity = useMemo(() => statsEngine.waitTimeBySeverity(treatmentRecords), [treatmentRecords]);

  const doctorUtil = doctors.map((d) => ({
    name: d.name.replace("Dr. ", ""),
    seen: d.patientsSeenToday,
  }));

  function exportCSV() {
    const header = "id,name,severity,status,arrivalTime,priorityScore\n";
    const rows = patients
      .map((p) => `${p.id},${p.name},${p.triageCategory},${p.status},${new Date(p.arrivalTime).toISOString()},${Math.round(p.priorityScore)}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pulse-er-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Analytics</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">Trends across the full patient dataset.</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download size={15} /> Export CSV
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <SectionHeading eyebrow="Volume" title="Arrivals over time" description="15-minute buckets." />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={arrivals}>
                <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-line)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--color-teal)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeading eyebrow="Outcome" title="Avg wait time by severity" description="Across completed treatments." />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waitBySeverity.map((d) => ({ ...d, label: SEVERITY_META[d.severity as SeverityLevel].label }))}>
                <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-line)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="avgWait" radius={[6, 6, 0, 0]}>
                  {waitBySeverity.map((d) => (
                    <Cell key={d.severity} fill={SEVERITY_META[d.severity as SeverityLevel].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeading eyebrow="Staffing" title="Doctor utilization" description="Patients seen today." />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={doctorUtil} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid stroke="var(--color-line-soft)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-line)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="seen" fill="var(--color-emerald)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeading eyebrow="Throughput" title="Completed treatments" description="Running total over time." />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={treatmentRecords.map((r, i) => ({
                  time: new Date(r.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  count: i + 1,
                }))}
              >
                <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-line)", borderRadius: 10, fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="var(--color-coral)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeading
          eyebrow="The evidence"
          title="FIFO vs Priority Queue vs Priority + Aging"
          description="A standardized 17-patient benchmark, replayed under three scheduling strategies."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setComparison(runStrategyComparison(buildComparisonBenchmark(Date.now()), weights, 2))}
            >
              <GitCompareArrows size={14} /> Run comparison
            </Button>
          }
        />
        <StrategyComparisonChart results={comparison} />
      </Card>
    </div>
  );
}
