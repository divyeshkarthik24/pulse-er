import type { ReactNode } from "react";
import { AnimatedCounter } from "../common/AnimatedCounter";
import clsx from "clsx";

export function StatCard({
  label,
  value,
  decimals = 0,
  suffix,
  icon,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  icon: ReactNode;
  tone?: "neutral" | "emerald" | "coral" | "amber" | "teal";
  sub?: string;
}) {
  const toneColor: Record<string, string> = {
    neutral: "var(--color-ink)",
    emerald: "var(--color-emerald)",
    coral: "var(--color-coral)",
    amber: "var(--color-amber)",
    teal: "var(--color-teal)",
  };
  const toneSoft: Record<string, string> = {
    neutral: "var(--color-paper-dim)",
    emerald: "var(--color-emerald-soft)",
    coral: "var(--color-coral-soft)",
    amber: "var(--color-amber-soft)",
    teal: "var(--color-teal-soft)",
  };
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 md:p-5 flex flex-col gap-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-ink-soft)]">{label}</span>
        <span
          className={clsx("h-8 w-8 rounded-lg flex items-center justify-center")}
          style={{ background: toneSoft[tone], color: toneColor[tone] }}
        >
          {icon}
        </span>
      </div>
      <div className="font-display text-3xl" style={{ color: toneColor[tone] }}>
        <AnimatedCounter value={value} decimals={decimals} suffix={suffix} />
      </div>
      {sub && <div className="text-xs text-[var(--color-ink-mute)]">{sub}</div>}
    </div>
  );
}
