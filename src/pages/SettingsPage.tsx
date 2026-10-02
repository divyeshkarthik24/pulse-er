import { useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { useERStore } from "../store/useERStore";
import { Card, SectionHeading } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { DEFAULT_WEIGHTS, REGISTRATION_VARIANCE_MAX, SEVERITY_BASE, type SchedulerWeights } from "../types";
import { useToastStore } from "../store/useToastStore";

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-[var(--color-ink-soft)]">{label}</span>
        <span className="font-mono font-semibold">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-emerald)]"
      />
    </div>
  );
}

export function SettingsPage() {
  const weights = useERStore((s) => s.weights);
  const updateWeights = useERStore((s) => s.updateWeights);
  const resetAll = useERStore((s) => s.resetAll);
  const pushToast = useToastStore((s) => s.push);

  const [draft, setDraft] = useState<SchedulerWeights>(weights);

  function set<K extends keyof SchedulerWeights>(key: K, value: number) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    updateWeights(next);
  }

  const maxBoost = draft.waitFactorCap + draft.agingCap + draft.emergencyWeight + REGISTRATION_VARIANCE_MAX;
  const tierGap = SEVERITY_BASE[1] - SEVERITY_BASE[2];
  const safe = maxBoost < tierGap;

  function resetWeights() {
    setDraft(DEFAULT_WEIGHTS);
    updateWeights(DEFAULT_WEIGHTS);
    pushToast({ title: "Weights reset to defaults", tone: "info" });
  }

  function handleResetAll() {
    if (confirm("Reset the entire ER state back to the seeded demo dataset? This clears all patients, doctors state, and history.")) {
      void resetAll();
      pushToast({ title: "ER reset", description: "Back to the seeded demo dataset.", tone: "info" });
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2.5">
          <SettingsIcon className="text-[var(--color-emerald)]" /> Scheduler Settings
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">
          Tune the live priority formula. Changes apply immediately to the whole queue.
        </p>
      </div>

      <Card>
        <SectionHeading eyebrow="Weights" title="Priority formula weights" />
        <div className="flex flex-col gap-5">
          <Slider label="Severity multiplier" value={draft.severityMultiplier} min={0.5} max={2} step={0.1} onChange={(v) => set("severityMultiplier", v)} />
          <Slider label="Waiting-time weight (pts/min)" value={draft.waitWeightPerMinute} min={0} max={5} step={0.5} onChange={(v) => set("waitWeightPerMinute", v)} />
          <Slider label="Waiting-time cap" value={draft.waitFactorCap} min={0} max={300} step={10} onChange={(v) => set("waitFactorCap", v)} />
          <Slider label="Aging threshold (min)" value={draft.agingThresholdMinutes} min={0} max={60} step={5} onChange={(v) => set("agingThresholdMinutes", v)} />
          <Slider label="Aging rate (pts/min after threshold)" value={draft.agingRatePerMinute} min={0} max={10} step={0.5} onChange={(v) => set("agingRatePerMinute", v)} />
          <Slider label="Aging cap" value={draft.agingCap} min={0} max={400} step={10} onChange={(v) => set("agingCap", v)} />
          <Slider label="Emergency weight" value={draft.emergencyWeight} min={0} max={300} step={10} onChange={(v) => set("emergencyWeight", v)} />
        </div>

        <div className="mt-5 pt-4 border-t border-[var(--color-line)]">
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{
              background: safe ? "var(--color-emerald-soft)" : "var(--color-coral-soft)",
              color: safe ? "var(--color-emerald)" : "var(--color-coral)",
            }}
          >
            {safe ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="shrink-0 mt-0.5" />}
            <div className="text-sm">
              <div className="font-semibold mb-0.5">
                {safe ? "Starvation-safety guarantee holds" : "Starvation-safety guarantee broken"}
              </div>
              Max possible boost from waiting + aging + emergency + intake variance is{" "}
              <strong className="font-mono">{Math.round(maxBoost)}</strong>, versus a{" "}
              <strong className="font-mono">{tierGap}</strong>-point gap between severity tiers.{" "}
              {safe
                ? "A lower-severity patient can never mathematically outrank a higher-severity one."
                : "With these weights, enough waiting time could let a lower-severity patient outrank a more severe one — useful for demonstrating the trade-off, but not the recommended default."}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={resetWeights}>
            <RotateCcw size={14} /> Reset weights to defaults
          </Button>
        </div>
      </Card>

      <Card>
        <SectionHeading eyebrow="Danger zone" title="Reset entire simulation" description="Clears all patients, doctors, and history back to the seeded demo." />
        <Button variant="danger" size="sm" onClick={handleResetAll}>
          <Trash2 size={14} /> Reset ER to demo data
        </Button>
      </Card>
    </div>
  );
}
