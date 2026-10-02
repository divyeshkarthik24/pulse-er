import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, ChevronDown, Gauge, Info } from "lucide-react";
import { useQueueHealth } from "../../hooks/useQueueHealth";
import { AnimatedCounter } from "../common/AnimatedCounter";
import { useERStore } from "../../store/useERStore";

const FACTOR_LABEL: Record<string, string> = {
  queueLoad: "Queue Load",
  criticalResponse: "Critical Response",
  waitingTimeRisk: "Waiting-Time Risk",
  fairness: "Fairness",
  doctorCapacity: "Doctor Capacity",
  roomCapacity: "Room Capacity",
  growthRate: "Growth Rate",
};

export function QueueHealthCard() {
  const health = useQueueHealth();
  const healthHistory = useERStore((s) => s.healthHistory);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] overflow-hidden shadow-[var(--shadow-soft)]">
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-mute)] flex items-center gap-1.5">
            <Gauge size={13} /> ER Queue Health
          </span>
          <ChevronDown size={16} className={`text-[var(--color-ink-mute)] transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
        <div className="flex items-end gap-3 mt-2">
          <motion.div
            key={health.score}
            initial={{ scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-display text-5xl"
            style={{ color: health.color }}
          >
            <AnimatedCounter value={health.score} />
          </motion.div>
          <span
            className="mb-2 text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
            style={{ background: `color-mix(in srgb, ${health.color} 14%, transparent)`, color: health.color }}
          >
            {health.stateLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 mt-4">
          {(["queueLoad", "criticalResponse", "fairness", "doctorCapacity", "waitingTimeRisk"] as const).map((k) => (
            <div key={k}>
              <div className="flex justify-between text-[11px] text-[var(--color-ink-mute)] mb-1">
                <span>{FACTOR_LABEL[k]}</span>
                <span className="font-mono">{Math.round(health.breakdown[k])}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--color-paper-dim)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: health.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${health.breakdown[k]}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          ))}
        </div>
      </button>

      {health.alerts.length > 0 && (
        <div className="px-5 pb-3 flex flex-col gap-1.5">
          {health.alerts.map((a) => (
            <div
              key={a.key}
              className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
              style={{
                background: a.severity === "critical" ? "var(--color-coral-soft)" : "var(--color-amber-soft)",
                color: a.severity === "critical" ? "var(--color-coral)" : "var(--color-amber)",
              }}
            >
              <AlertTriangle size={13} className="shrink-0" />
              {a.message}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[var(--color-line)] overflow-hidden"
          >
            <div className="p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-emerald)] mb-3">
                Breakdown
              </div>
              <div className="flex flex-col gap-2.5 mb-4">
                {(Object.keys(health.breakdown) as (keyof typeof health.breakdown)[]).map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-ink-soft)] w-32 shrink-0">{FACTOR_LABEL[k]}</span>
                    <div className="h-2 flex-1 rounded-full bg-[var(--color-paper-dim)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--color-emerald)]" style={{ width: `${health.breakdown[k]}%` }} />
                    </div>
                    <span className="font-mono text-xs w-10 text-right">{Math.round(health.breakdown[k])}%</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-[var(--color-paper-dim)] p-3.5 mb-4 flex items-start gap-2">
                <Info size={14} className="mt-0.5 shrink-0 text-[var(--color-ink-mute)]" />
                <div className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
                  <div className="font-medium text-[var(--color-ink)] mb-0.5">{health.primaryPressure}</div>
                  {health.recommendation}
                </div>
              </div>

              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-emerald)] mb-2 flex items-center gap-1.5">
                <Activity size={13} /> DSA connection
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                <DsaStat label="Heap size" value={health.dsa.heapSize} />
                <DsaStat label="Highest priority" value={health.dsa.highestPriority} />
                <DsaStat label="Avg priority" value={health.dsa.avgEffectivePriority} />
                <DsaStat label="Max wait (m)" value={health.dsa.maxWaitMinutes} />
                <DsaStat label="Critical waiting" value={health.dsa.criticalWaiting} />
              </div>

              {healthHistory.length > 1 && (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-emerald)] mb-2">
                    Health over time
                  </div>
                  <HealthSparkline history={healthHistory} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DsaStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center rounded-lg border border-[var(--color-line-soft)] py-2">
      <div className="text-[10px] text-[var(--color-ink-mute)] mb-0.5">{label}</div>
      <div className="font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}

function HealthSparkline({ history }: { history: { time: number; score: number }[] }) {
  const w = 600;
  const h = 60;
  const recent = history.slice(-60);
  const points = recent
    .map((p, i) => {
      const x = (i / Math.max(1, recent.length - 1)) * w;
      const y = h - (p.score / 100) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="var(--color-emerald)" strokeWidth={2} />
    </svg>
  );
}
