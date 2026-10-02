import { motion } from "framer-motion";
import type { Patient } from "../../types";
import { SeverityBadge } from "../common/Badge";
import { Sparkles } from "lucide-react";

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-dashed border-[var(--color-line)] last:border-0">
      <span className="text-xs text-[var(--color-ink-mute)]">{label}</span>
      <span className="font-mono text-sm font-semibold" style={{ color: tone }}>
        {value}
      </span>
    </div>
  );
}

export function ExplainabilityPanel({ patient }: { patient: Patient | undefined }) {
  if (!patient) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-ink-mute)]">
        Select a patient, or call the next patient, to see why they were prioritized.
      </div>
    );
  }
  const b = patient.priorityBreakdown;

  return (
    <motion.div
      key={patient.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={15} className="text-[var(--color-emerald)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-emerald)]">
          Why this patient
        </span>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg">
          {patient.name} <span className="text-[var(--color-ink-mute)] font-sans text-sm">#{patient.id}</span>
        </h3>
        <SeverityBadge severity={patient.severity} />
      </div>

      <div className="flex flex-col">
        <Row label="Severity base" value={`+${b.severityBase}`} />
        <Row label="Waiting time" value={`${b.waitMinutes} min`} />
        <Row label="Waiting credit" value={`+${b.waitFactor}`} />
        <Row
          label={b.agingActive ? "Aging / fairness bonus (active)" : "Aging / fairness bonus"}
          value={`+${b.agingBonus}`}
          tone={b.agingActive ? "var(--color-amber)" : undefined}
        />
        <Row
          label="Emergency modifier"
          value={patient.isEmergency ? `+${b.emergencyModifier}` : "+0"}
          tone={patient.isEmergency ? "var(--color-coral)" : undefined}
        />
        <Row label="Intake variance" value={`+${b.registrationVariance}`} />
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--color-line)] flex items-center justify-between">
        <span className="text-sm font-semibold">Final priority</span>
        <span className="font-mono text-xl font-bold text-[var(--color-emerald)]">{b.finalScore}</span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[var(--color-ink-soft)] bg-[var(--color-paper-dim)] rounded-xl p-3">
        Selected because this patient currently holds the highest effective priority score in the queue —
        combining clinical severity, how long they've waited, and (when applicable) the fairness/aging bonus
        that prevents indefinite starvation.
      </p>
    </motion.div>
  );
}
