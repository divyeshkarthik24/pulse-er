import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, GitCompareArrows, Siren, Stethoscope, TimerReset, UserPlus, X } from "lucide-react";
import { useERStore } from "../store/useERStore";
import { useClockTick } from "../hooks/useClockTick";
import { HeapVisualizer } from "../components/queue/HeapVisualizer";
import { ExplainabilityPanel } from "../components/explain/ExplainabilityPanel";
import { PatientCard } from "../components/patient/PatientCard";
import { StrategyComparisonChart } from "../components/analytics/StrategyComparisonChart";
import { runStrategyComparison } from "../analytics/algorithmComparison";
import { buildComparisonBenchmark } from "../analytics/comparisonBenchmark";
import type { AlgorithmStrategyResult } from "../types";
import { ToastHost } from "../components/common/ToastHost";
import { useToastStore } from "../store/useToastStore";
import { DemoScenarioControl } from "../components/common/DemoScenarioControl";

const STEPS = [
  { id: "add5", label: "Add 5 patients", hint: "Random arrivals populate the heap." },
  { id: "critical", label: "Introduce a critical patient", hint: "Watch it jump straight to the root." },
  { id: "wait", label: "Advance waiting time", hint: "Fast-forward 25 simulated minutes." },
  { id: "aging", label: "Demonstrate aging", hint: "Long-waiting patients gain a fairness bonus." },
  { id: "call", label: "Call next patient", hint: "The scheduler explains exactly why." },
  { id: "compare", label: "Compare FIFO vs Priority Queue", hint: "Show the measurable difference." },
] as const;

const PRESENTATION_SEQUENCE = [
  { label: "1. Dashboard", to: "/app" },
  { label: "2. Heap Stepper", to: "/app/dsa/stepper" },
  { label: "3. Fairness Challenge", to: "/app/dsa/fairness" },
  { label: "4. Algorithm Duel", to: "/app/dsa/duel" },
  { label: "5. Queue Replay", to: "/app/dsa/replay" },
  { label: "6. Benchmark Lab", to: "/app/benchmark" },
] as const;

export function PresentationPage() {
  const init = useERStore((s) => s.init);
  const initialized = useERStore((s) => s.initialized);
  const sortedQueue = useERStore((s) => s.sortedQueue);
  const heapArray = useERStore((s) => s.heapArray);
  const lastHeapOps = useERStore((s) => s.lastHeapOps);
  const lastAnnouncement = useERStore((s) => s.lastAnnouncement);
  const patients = useERStore((s) => s.patients);
  const weights = useERStore((s) => s.weights);
  const quickAdd = useERStore((s) => s.quickAddRandomPatient);
  const callNextPatient = useERStore((s) => s.callNextPatient);
  const fastForward = useERStore((s) => s.fastForward);
  const pushToast = useToastStore((s) => s.push);

  useEffect(() => {
    if (!initialized) void init();
  }, [initialized, init]);
  useClockTick();

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [comparison, setComparison] = useState<AlgorithmStrategyResult[]>([]);
  const selectedPatient = sortedQueue[0] ?? patients.find((p) => p.id === lastAnnouncement?.patientId);

  function markDone(id: string) {
    setCompletedSteps((prev) => new Set(prev).add(id));
  }

  function runStep(id: (typeof STEPS)[number]["id"]) {
    switch (id) {
      case "add5":
        for (let i = 0; i < 5; i++) quickAdd();
        pushToast({ title: "5 patients added", tone: "info" });
        break;
      case "critical":
        quickAdd(1);
        pushToast({ title: "Critical patient inserted", description: "Watch it rise to the top of the heap.", tone: "critical" });
        break;
      case "wait":
        fastForward(25);
        pushToast({ title: "Fast-forwarded 25 minutes", tone: "info" });
        break;
      case "aging":
        fastForward(20);
        pushToast({ title: "Aging bonuses applied", description: "Long-waiting patients just got a fairness boost.", tone: "warning" });
        break;
      case "call": {
        const p = callNextPatient();
        if (p) pushToast({ title: `${p.name} called in`, tone: "success" });
        else pushToast({ title: "No doctor available right now", tone: "warning" });
        break;
      }
      case "compare":
        setComparison(runStrategyComparison(buildComparisonBenchmark(Date.now()), weights, 2));
        break;
    }
    markDone(id);
  }

  if (!initialized) return null;

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)] flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-emerald)]">
          Presentation Mode
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <DemoScenarioControl compact />
          <Link to="/app" className="flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            <X size={16} /> Exit
          </Link>
        </div>
      </header>

      <div className="px-6 py-3 border-b border-[var(--color-line)] flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-mute)] shrink-0 mr-1">
          Full sequence:
        </span>
        {PRESENTATION_SEQUENCE.map((step) => (
          <Link
            key={step.to}
            to={step.to}
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--color-line)] text-[var(--color-ink-soft)] hover:border-[var(--color-emerald)] hover:text-[var(--color-emerald)] transition-colors whitespace-nowrap"
          >
            {step.label}
          </Link>
        ))}
        <span className="shrink-0 text-xs text-[var(--color-ink-mute)] px-3 py-1.5">7. Queue Health (on Dashboard)</span>
      </div>

      <div className="max-w-[1500px] mx-auto px-6 py-8 grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
            <h2 className="font-display text-xl mb-4">Queue Intelligence — live heap</h2>
            <HeapVisualizer heapArray={heapArray} ops={lastHeapOps} />
          </div>

          <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
            <h2 className="font-display text-xl mb-4">Priority order ({sortedQueue.length} waiting)</h2>
            <div className="grid sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {sortedQueue.slice(0, 10).map((p, i) => (
                <PatientCard key={p.id} patient={p} rank={i + 1} dense />
              ))}
            </div>
          </div>

          {comparison.length > 0 && (
            <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
              <h2 className="font-display text-xl mb-4 flex items-center gap-2">
                <GitCompareArrows size={18} /> FIFO vs Priority Queue vs Priority + Aging
              </h2>
              <StrategyComparisonChart results={comparison} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <ExplainabilityPanel patient={selectedPatient} />

          <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <h3 className="font-display text-lg mb-4">5–10 minute demo script</h3>
            <div className="flex flex-col gap-2">
              {STEPS.map((step, i) => {
                const done = completedSteps.has(step.id);
                const Icon = {
                  add5: UserPlus,
                  critical: Siren,
                  wait: TimerReset,
                  aging: TimerReset,
                  call: Stethoscope,
                  compare: GitCompareArrows,
                }[step.id];
                return (
                  <button
                    key={step.id}
                    onClick={() => runStep(step.id)}
                    className="flex items-start gap-3 rounded-xl border border-[var(--color-line)] p-3 text-left hover:border-[var(--color-emerald)] transition group"
                  >
                    {done ? (
                      <CheckCircle2 size={18} className="text-[var(--color-emerald)] shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={18} className="text-[var(--color-ink-mute)] shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        <span className="font-mono text-xs text-[var(--color-ink-mute)]">{i + 1}.</span>
                        {step.label}
                      </div>
                      <div className="text-xs text-[var(--color-ink-mute)] mt-0.5">{step.hint}</div>
                    </div>
                    <Icon size={16} className="text-[var(--color-ink-mute)] group-hover:text-[var(--color-emerald)] shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <ToastHost />
    </div>
  );
}
