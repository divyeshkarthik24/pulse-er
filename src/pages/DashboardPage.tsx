import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Clock,
  Cpu,
  DoorClosed,
  GitCompareArrows,
  ListTree,
  Scale,
  Siren,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { useERStore } from "../store/useERStore";
import { StatCard } from "../components/dashboard/StatCard";
import { SeverityBreakdown } from "../components/dashboard/SeverityBreakdown";
import { DoctorPanel } from "../components/dashboard/DoctorPanel";
import { Card, SectionHeading } from "../components/common/Card";
import { PatientCard } from "../components/patient/PatientCard";
import { ExplainabilityPanel } from "../components/explain/ExplainabilityPanel";
import { QueueHealthCard } from "../components/health/QueueHealthCard";
import { statsEngine } from "../store/engineInstances";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Button } from "../components/common/Button";
import { useToastStore } from "../store/useToastStore";
import { DemoScenarioControl } from "../components/common/DemoScenarioControl";

const QUICK_ACTIONS = [
  { to: "/app/queue", label: "Live Queue", icon: ListTree },
  { to: "/app/presentation", label: "Run Simulation", icon: Sparkles },
  { to: "/app/dsa/duel", label: "Algorithm Duel", icon: GitCompareArrows },
  { to: "/app/benchmark", label: "Benchmark Lab", icon: Cpu },
  { to: "/app/dsa/fairness", label: "Fairness Challenge", icon: Scale },
];

export function DashboardPage() {
  const patients = useERStore((s) => s.patients);
  const doctors = useERStore((s) => s.doctors);
  const departments = useERStore((s) => s.departments);
  const treatmentRecords = useERStore((s) => s.treatmentRecords);
  const sortedQueue = useERStore((s) => s.sortedQueue);
  const queueSizeHistory = useERStore((s) => s.queueSizeHistory);
  const clock = useERStore((s) => s.clock);
  const callNextPatient = useERStore((s) => s.callNextPatient);
  const quickAdd = useERStore((s) => s.quickAddRandomPatient);
  const dsaActivity = useERStore((s) => s.dsaActivityCounters);
  const pushToast = useToastStore((s) => s.push);

  const [selectedId, setSelectedId] = useState<string | undefined>();

  const stats = useMemo(() => {
    const roomsTotal = departments.reduce((a, d) => a + d.roomsTotal, 0);
    const roomsOccupied = departments.reduce((a, d) => a + d.roomsOccupied, 0);
    return statsEngine.computeDashboard(patients, doctors, treatmentRecords, { total: roomsTotal, occupied: roomsOccupied }, clock);
  }, [patients, doctors, treatmentRecords, departments, clock]);

  const selectedPatient = sortedQueue.find((p) => p.id === selectedId) ?? sortedQueue[0];

  const chartData = queueSizeHistory.length
    ? queueSizeHistory.map((s) => ({ time: new Date(s.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), size: s.size }))
    : [{ time: "now", size: sortedQueue.length }];

  function handleCallNext() {
    const p = callNextPatient();
    if (p) {
      pushToast({ title: `${p.name} called in`, description: `Assigned — ${p.triageCategory}`, tone: "success" });
    } else {
      pushToast({ title: "No doctor available", description: "All doctors are currently with patients.", tone: "warning" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">ER Command Center</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">Operational overview, updated live.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DemoScenarioControl compact />
          <Button variant="outline" onClick={() => quickAdd()}>
            <Users size={15} /> Quick-add patient
          </Button>
          <Button variant="primary" onClick={handleCallNext}>
            <Stethoscope size={15} /> Call next patient
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Patients waiting" value={stats.totalWaiting} icon={<Users size={16} />} tone="teal" />
        <StatCard label="Critical waiting" value={stats.criticalWaiting} icon={<Siren size={16} />} tone="coral" />
        <StatCard
          label="Avg wait time"
          value={stats.avgWaitMinutes}
          suffix=" min"
          decimals={1}
          icon={<Clock size={16} />}
          tone="amber"
        />
        <StatCard
          label="Treated today"
          value={stats.patientsTreatedToday}
          icon={<Activity size={16} />}
          tone="emerald"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QueueHealthCard />
        </div>
        <Card padding="md" className="flex flex-col">
          <SectionHeading eyebrow="This session" title="DSA Activity" />
          <div className="grid grid-cols-2 gap-3 flex-1">
            <DsaActivityStat label="Heap insertions" value={dsaActivity.insertions} />
            <DsaActivityStat label="Heap swaps" value={dsaActivity.swaps} />
            <DsaActivityStat label="Priority updates" value={dsaActivity.priorityUpdates} />
            <DsaActivityStat label="Aging events" value={dsaActivity.agingEvents} />
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeading eyebrow="Jump to" title="Quick actions" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="flex flex-col items-center gap-2 rounded-xl border border-[var(--color-line)] px-3 py-3.5 text-center hover:border-[var(--color-emerald)] hover:bg-[var(--color-emerald-soft)] transition-colors group"
            >
              <a.icon size={18} className="text-[var(--color-ink-mute)] group-hover:text-[var(--color-emerald)]" />
              <span className="text-xs font-medium text-[var(--color-ink-soft)] group-hover:text-[var(--color-emerald)]">
                {a.label}
              </span>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <SectionHeading
              eyebrow="Trend"
              title="Queue size over time"
              description="Sampled every simulated minute."
            />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="queueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-emerald)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-emerald)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-mute)" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-line)", borderRadius: 10, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="size" stroke="var(--color-emerald)" strokeWidth={2} fill="url(#queueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SectionHeading eyebrow="Priority order" title="Top of the queue" description="Highest effective priority first." />
            <div className="grid sm:grid-cols-2 gap-3">
              {sortedQueue.slice(0, 6).map((p, i) => (
                <PatientCard key={p.id} patient={p} rank={i + 1} selected={p.id === selectedId} onSelect={(pat) => setSelectedId(pat.id)} dense />
              ))}
              {sortedQueue.length === 0 && (
                <div className="col-span-2 text-center text-sm text-[var(--color-ink-mute)] py-8">Queue is empty.</div>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <ExplainabilityPanel patient={selectedPatient} />
          <SeverityBreakdown bySeverity={stats.bySeverity} />
          <DoctorPanel doctors={doctors} />
          <Card padding="sm" className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-[var(--color-ink-soft)] flex items-center gap-1.5">
              <DoorClosed size={14} /> Treatment rooms
            </span>
            <span className="font-mono text-sm font-semibold">
              {stats.roomsOccupied}/{stats.roomsTotal}
            </span>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DsaActivityStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--color-paper-dim)] p-3 flex flex-col justify-center">
      <div className="font-mono text-xl font-semibold text-[var(--color-emerald)]">{value}</div>
      <div className="text-[11px] text-[var(--color-ink-mute)] mt-0.5">{label}</div>
    </div>
  );
}
