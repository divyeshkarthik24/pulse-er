import { Settings2 } from "lucide-react";
import type { SchedulerConfigVersion } from "../../types";

export function SchedulerConfigPanel({ config }: { config: SchedulerConfigVersion | undefined }) {
  if (!config) return null;
  const w = config.weights;
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Settings2 size={15} className="text-[var(--color-emerald)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-emerald)]">
          Scheduler configuration active here
        </span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-display text-lg">Version {config.version}</span>
        <span className="text-xs text-[var(--color-ink-mute)] font-mono">
          since {new Date(config.activatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <Row label="Severity multiplier" value={w.severityMultiplier} />
        <Row label="Waiting weight /min" value={w.waitWeightPerMinute} />
        <Row label="Waiting cap" value={w.waitFactorCap} />
        <Row label="Aging threshold (min)" value={w.agingThresholdMinutes} />
        <Row label="Aging rate /min" value={w.agingRatePerMinute} />
        <Row label="Aging cap" value={w.agingCap} />
        <Row label="Emergency weight" value={w.emergencyWeight} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-dashed border-[var(--color-line-soft)]">
      <span className="text-[var(--color-ink-mute)]">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}
