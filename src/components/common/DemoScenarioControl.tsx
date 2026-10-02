import { useState } from "react";
import { ChevronDown, PlayCircle, RotateCcw } from "lucide-react";
import { DEMO_SCENARIOS } from "../../data/demoScenarios";
import { useERStore } from "../../store/useERStore";
import { useToastStore } from "../../store/useToastStore";
import { Button } from "./Button";
import clsx from "clsx";

/**
 * Small, unobtrusive presentation-reliability control — not a new page,
 * not in the primary navigation. Loading a scenario restores patients,
 * queue, doctors, rooms, clock, event log, DSA counters, and health
 * history together in one deterministic action.
 */
export function DemoScenarioControl({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const currentScenario = useERStore((s) => s.currentScenario);
  const loadDemoScenario = useERStore((s) => s.loadDemoScenario);
  const resetCurrentScenario = useERStore((s) => s.resetCurrentScenario);
  const pushToast = useToastStore((s) => s.push);

  const currentMeta = DEMO_SCENARIOS.find((s) => s.key === currentScenario);

  function handleLoad(key: (typeof DEMO_SCENARIOS)[number]["key"]) {
    loadDemoScenario(key);
    setOpen(false);
    const meta = DEMO_SCENARIOS.find((s) => s.key === key);
    pushToast({ title: `${meta?.label} loaded`, description: "Deterministic scenario — reproducible every time.", tone: "success" });
  }

  function handleResetSame() {
    resetCurrentScenario();
    pushToast({ title: `${currentMeta?.label} reloaded`, description: "Back to the exact starting state.", tone: "info" });
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <Button variant={compact ? "outline" : "secondary"} size="sm" onClick={() => setOpen((v) => !v)}>
          <PlayCircle size={14} /> Demo Scenarios
          <ChevronDown size={13} className={clsx("transition-transform", open && "rotate-180")} />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleResetSame} title={`Reload "${currentMeta?.label}" from scratch`}>
          <RotateCcw size={14} /> Reset Demo
        </Button>
      </div>

      {open && (
        <div className="absolute z-20 top-full mt-2 left-0 w-80 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-lift)] p-2">
          {DEMO_SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => handleLoad(s.key)}
              className={clsx(
                "w-full text-left rounded-xl px-3 py-2.5 transition-colors",
                s.key === currentScenario ? "bg-[var(--color-emerald-soft)]" : "hover:bg-[var(--color-paper-dim)]"
              )}
            >
              <div className="text-sm font-semibold flex items-center gap-1.5">
                {s.label}
                {s.key === currentScenario && (
                  <span className="text-[10px] font-medium text-[var(--color-emerald)] uppercase tracking-wide">active</span>
                )}
              </div>
              <div className="text-xs text-[var(--color-ink-mute)] mt-0.5 leading-snug">{s.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
