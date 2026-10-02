import type { ReactNode } from "react";
import clsx from "clsx";
import { SEVERITY_META, STATUS_LABEL, type PatientStatus, type SeverityLevel } from "../../types";

export function SeverityBadge({ severity, size = "md" }: { severity: SeverityLevel; size?: "sm" | "md" }) {
  const meta = SEVERITY_META[severity];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-semibold border",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      )}
      style={{
        color: meta.color,
        borderColor: `color-mix(in srgb, ${meta.color} 35%, transparent)`,
        background: `color-mix(in srgb, ${meta.color} 10%, var(--color-surface))`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: PatientStatus }) {
  const tones: Record<PatientStatus, string> = {
    registered: "var(--color-ink-mute)",
    triage: "var(--color-amber)",
    queued: "var(--color-teal)",
    assigned: "var(--color-steel)",
    "in-treatment": "var(--color-emerald)",
    completed: "var(--color-ink-mute)",
    discharged: "var(--color-ink-mute)",
  };
  const color = tones[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        background: `color-mix(in srgb, ${color} 8%, var(--color-surface))`,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "emerald" | "coral" | "amber" | "teal" }) {
  const tones: Record<string, string> = {
    neutral: "var(--color-ink-mute)",
    emerald: "var(--color-emerald)",
    coral: "var(--color-coral)",
    amber: "var(--color-amber)",
    teal: "var(--color-teal)",
  };
  const color = tones[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase"
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {children}
    </span>
  );
}
