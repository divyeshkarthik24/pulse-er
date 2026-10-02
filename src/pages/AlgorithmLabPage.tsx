import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, FlaskConical, GitCompareArrows, Plus, RotateCcw, Siren, TimerReset, Trash2 } from "lucide-react";
import { useAlgoLabStore } from "../store/useAlgoLabStore";
import { HeapVisualizer } from "../components/queue/HeapVisualizer";
import { Card, SectionHeading } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { SEVERITY_META, type SeverityLevel } from "../types";
import { StrategyComparisonChart } from "../components/analytics/StrategyComparisonChart";
import { AnimatePresence, motion } from "framer-motion";

const COMPLEXITY = [
  { op: "Insert", big: "O(log n)", note: "Sift-up along one root-to-leaf path." },
  { op: "Extract-max", big: "O(log n)", note: "Sift-down after moving the last leaf to the root." },
  { op: "Peek next", big: "O(1)", note: "The highest priority patient is always the root." },
  { op: "Re-score all (aging tick)", big: "O(n)", note: "Full re-heapify — done periodically, not per-frame." },
];

export function AlgorithmLabPage() {
  const patients = useAlgoLabStore((s) => s.patients);
  const heapArray = useAlgoLabStore((s) => s.heapArray);
  const sortedQueue = useAlgoLabStore((s) => s.sortedQueue);
  const lastOps = useAlgoLabStore((s) => s.lastOps);
  const lastAction = useAlgoLabStore((s) => s.lastAction);
  const comparison = useAlgoLabStore((s) => s.comparison);
  const seed = useAlgoLabStore((s) => s.seed);
  const addRandomPatient = useAlgoLabStore((s) => s.addRandomPatient);
  const removeHighestPriority = useAlgoLabStore((s) => s.removeHighestPriority);
  const changeSeverity = useAlgoLabStore((s) => s.changeSeverity);
  const advanceWaitingTime = useAlgoLabStore((s) => s.advanceWaitingTime);
  const triggerAgingSweep = useAlgoLabStore((s) => s.triggerAgingSweep);
  const runComparison = useAlgoLabStore((s) => s.runComparison);
  const reset = useAlgoLabStore((s) => s.reset);

  const [targetId, setTargetId] = useState<string | undefined>();

  useEffect(() => {
    if (patients.length === 0) seed();
  }, [patients.length, seed]);

  useEffect(() => {
    if (!targetId && patients[0]) setTargetId(patients[0].id);
  }, [patients, targetId]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2.5">
            <FlaskConical className="text-[var(--color-emerald)]" /> Algorithm Lab
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            A sandbox heap, isolated from the live ER — experiment freely with inserts, extractions, aging, and escalation.
          </p>
        </div>
        <Link to="/app/benchmark" className="text-sm text-[var(--color-emerald)] font-medium hover:underline flex items-center gap-1.5">
          <Cpu size={14} /> Run Benchmark →
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <SectionHeading
              eyebrow="Pipeline"
              title="Heap Array → Heap Tree → Priority Order"
              description="Three views of the exact same data structure."
            />
            <HeapVisualizer heapArray={heapArray} ops={lastOps} />
          </Card>

          <Card>
            <SectionHeading eyebrow="Result" title="Current priority order" />
            <div className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {sortedQueue.map((p, i) => {
                  const meta = SEVERITY_META[p.severity];
                  return (
                    <motion.div
                      layout
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 border border-[var(--color-line-soft)]"
                    >
                      <span className="font-mono text-xs w-5 text-[var(--color-ink-mute)]">{i + 1}</span>
                      <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                      <span className="text-sm font-medium flex-1">{p.id}</span>
                      <span className="text-xs text-[var(--color-ink-mute)]">{meta.label}</span>
                      <span className="font-mono text-xs font-semibold w-12 text-right">{Math.round(p.priorityScore)}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </Card>

          {comparison.length > 0 && (
            <Card>
              <SectionHeading eyebrow="Evidence" title="FIFO vs Priority Queue vs Priority + Aging" />
              <StrategyComparisonChart results={comparison} />
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <SectionHeading eyebrow="Operations" title="Try it" />
            <div className="flex flex-col gap-2">
              <Button variant="primary" size="sm" onClick={() => addRandomPatient()}>
                <Plus size={14} /> Add random patient
              </Button>
              <Button variant="outline" size="sm" onClick={() => addRandomPatient(1)}>
                <Siren size={14} /> Add critical patient
              </Button>
              <Button variant="secondary" size="sm" onClick={removeHighestPriority}>
                <Trash2 size={14} /> Remove highest priority
              </Button>
              <Button variant="secondary" size="sm" onClick={() => advanceWaitingTime(15)}>
                <TimerReset size={14} /> Advance time +15 min
              </Button>
              <Button variant="secondary" size="sm" onClick={triggerAgingSweep}>
                <TimerReset size={14} /> Trigger aging sweep
              </Button>
              <Button variant="secondary" size="sm" onClick={runComparison}>
                <GitCompareArrows size={14} /> Compare algorithms
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw size={14} /> Reset sandbox
              </Button>
            </div>

            {patients.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--color-line)]">
                <div className="text-xs text-[var(--color-ink-mute)] mb-1.5">Change severity of</div>
                <select
                  className="w-full border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 text-sm bg-[var(--color-surface-raised)] mb-2"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.triageCategory}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-5 gap-1">
                  {([1, 2, 3, 4, 5] as SeverityLevel[]).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => targetId && changeSeverity(targetId, sev)}
                      className="text-[10px] font-semibold py-1.5 rounded-md border border-[var(--color-line)] hover:border-[var(--color-ink-mute)]"
                      style={{ color: SEVERITY_META[sev].color }}
                    >
                      {SEVERITY_META[sev].short}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {lastAction && (
              <div className="mt-4 text-xs text-[var(--color-emerald)] bg-[var(--color-emerald-soft)] rounded-lg p-2.5 flex items-start gap-1.5">
                <ArrowRight size={13} className="mt-0.5 shrink-0" />
                {lastAction}
              </div>
            )}
          </Card>

          <Card>
            <SectionHeading eyebrow="Why a heap" title="Time complexity" />
            <div className="flex flex-col gap-2.5">
              {COMPLEXITY.map((c) => (
                <div key={c.op} className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{c.op}</div>
                    <div className="text-xs text-[var(--color-ink-mute)]">{c.note}</div>
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--color-emerald)] shrink-0">{c.big}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
