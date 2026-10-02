import clsx from "clsx";
import { ArrowDownUp, Equal, GitCompareArrows, MapPin } from "lucide-react";
import type { HeapOpStep } from "../../types";

const ICONS = { compare: GitCompareArrows, swap: ArrowDownUp, "set-root": MapPin, none: Equal };

export function HeapStepTimeline({
  steps,
  stepIndex,
  onJump,
}: {
  steps: HeapOpStep[];
  stepIndex: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="flex flex-col max-h-[380px] overflow-y-auto pr-1">
      {steps.length === 0 && (
        <div className="text-sm text-[var(--color-ink-mute)] text-center py-8">
          Trigger an operation above to see its step-by-step log.
        </div>
      )}
      {steps.map((step, i) => {
        const Icon = ICONS[step.type];
        const active = stepIndex === i + 1;
        const done = stepIndex > i + 1;
        return (
          <button
            key={i}
            onClick={() => onJump(i + 1)}
            className={clsx(
              "flex items-start gap-3 text-left px-3 py-2.5 rounded-xl border transition-colors",
              active
                ? "border-[var(--color-emerald)] bg-[var(--color-emerald-soft)]"
                : "border-transparent hover:bg-[var(--color-paper-dim)]",
              done && !active && "opacity-60"
            )}
          >
            <span className="font-mono text-[10px] text-[var(--color-ink-mute)] w-5 pt-0.5 shrink-0">{i + 1}</span>
            <Icon size={14} className={clsx("mt-0.5 shrink-0", active ? "text-[var(--color-emerald)]" : "text-[var(--color-ink-mute)]")} />
            <span className="text-xs leading-relaxed text-[var(--color-ink-soft)]">{step.note}</span>
          </button>
        );
      })}
    </div>
  );
}
