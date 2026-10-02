import { AnimatePresence, motion } from "framer-motion";
import { SEVERITY_META, type DuelFrame, type Patient } from "../../types";
import clsx from "clsx";

const STRATEGY_COLOR: Record<string, string> = {
  fifo: "var(--color-steel)",
  priority: "var(--color-amber)",
  "priority-aging": "var(--color-emerald)",
};

export function DuelQueuePanel({
  label,
  strategy,
  waitingIds,
  servedId,
  patientsById,
}: {
  label: string;
  strategy: string;
  waitingIds: string[];
  servedId?: string;
  patientsById: Map<string, Patient>;
}) {
  const color = STRATEGY_COLOR[strategy];
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <h3 className="text-sm font-semibold">{label}</h3>
      </div>
      <AnimatePresence mode="wait">
        {servedId && patientsById.get(servedId) && (
          <motion.div
            key={`served-${servedId}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl px-3 py-2 mb-2 text-xs font-medium"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
          >
            ✓ Served: {patientsById.get(servedId)?.name} ({servedId})
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto max-h-[420px] pr-1">
        <AnimatePresence initial={false}>
          {waitingIds.map((id, i) => {
            const p = patientsById.get(id);
            if (!p) return null;
            const meta = SEVERITY_META[p.severity];
            return (
              <motion.div
                layout
                key={id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className={clsx(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
                  i === 0 ? "border-current shadow-[var(--shadow-soft)]" : "border-[var(--color-line-soft)]"
                )}
                style={i === 0 ? { color, borderColor: color } : undefined}
              >
                <span className="font-mono text-[10px] text-[var(--color-ink-mute)] w-4">{i + 1}</span>
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                <span className="truncate flex-1 text-[var(--color-ink)]">{p.id}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {waitingIds.length === 0 && (
          <div className="text-center text-xs text-[var(--color-ink-mute)] py-6">Queue cleared.</div>
        )}
      </div>
    </div>
  );
}

export type { DuelFrame };
