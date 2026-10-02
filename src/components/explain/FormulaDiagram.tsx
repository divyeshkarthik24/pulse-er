import type { PriorityBreakdown } from "../../types";
import { formulaSteps } from "../../dsa/priorityExplain";

const CONCEPT_COLOR: Record<string, string> = {
  urgency: "var(--color-coral)",
  fairness: "var(--color-emerald)",
  tiebreak: "var(--color-steel)",
};

export function FormulaDiagram({ breakdown }: { breakdown: PriorityBreakdown }) {
  const steps = formulaSteps(breakdown);

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
      <div className="flex flex-col items-center shrink-0">
        <div className="rounded-xl border-2 border-[var(--color-ink)] px-4 py-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-mute)]">Effective Priority</div>
          <div className="font-mono text-2xl font-bold">{Math.round(breakdown.finalScore)}</div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center gap-3">
              <span className="font-mono text-[var(--color-ink-mute)] text-sm w-5 text-center shrink-0">
                {i === 0 ? "" : "+"}
              </span>
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: CONCEPT_COLOR[step.concept] }}
              />
              <span className="text-sm text-[var(--color-ink-soft)] flex-1">{step.label}</span>
              <span className="font-mono text-sm font-semibold w-14 text-right">{Math.round(step.value)}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 mt-1 border-t border-dashed border-[var(--color-line)]">
            <span className="font-mono text-[var(--color-ink-mute)] text-sm w-5 text-center shrink-0">−</span>
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CONCEPT_COLOR.tiebreak }} />
            <span className="text-sm text-[var(--color-ink-soft)] flex-1">
              Arrival Sequence <span className="text-[var(--color-ink-mute)]">(only resolves exact ties)</span>
            </span>
            <span className="font-mono text-sm font-semibold w-14 text-right">{breakdown.tieBreaker.toFixed(4)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 text-[11px]">
          <Legend color={CONCEPT_COLOR.urgency} label="Urgency" />
          <Legend color={CONCEPT_COLOR.fairness} label="Fairness" />
          <Legend color={CONCEPT_COLOR.tiebreak} label="Tie-breaking" />
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[var(--color-ink-mute)]">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
