import { Pause, Play, RotateCcw, Zap } from "lucide-react";
import { useERStore } from "../../store/useERStore";
import { Button } from "../common/Button";
import clsx from "clsx";

const SPEEDS = [1, 2, 5, 10] as const;

export function SimulationControls({ compact }: { compact?: boolean }) {
  const simulation = useERStore((s) => s.simulation);
  const start = useERStore((s) => s.startSimulation);
  const pause = useERStore((s) => s.pauseSimulation);
  const resume = useERStore((s) => s.resumeSimulation);
  const reset = useERStore((s) => s.resetSimulation);
  const setSpeed = useERStore((s) => s.setSimulationSpeed);
  const setArrivalRate = useERStore((s) => s.setArrivalRate);

  return (
    <div className={clsx("rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]", compact ? "p-3" : "p-5")}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Zap size={15} className="text-[var(--color-amber)]" />
          ER Simulation
        </div>
        <span
          className={clsx(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            simulation.running ? "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]" : "bg-[var(--color-paper-dim)] text-[var(--color-ink-mute)]"
          )}
        >
          {simulation.running ? "Running" : "Stopped"}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {!simulation.running ? (
          <Button variant="primary" size="sm" onClick={start}>
            <Play size={14} /> Start
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={pause}>
            <Pause size={14} /> Pause
          </Button>
        )}
        {!simulation.running && (
          <Button variant="outline" size="sm" onClick={resume}>
            <Play size={14} /> Resume
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw size={14} /> Reset
        </Button>
      </div>

      <div className="mb-4">
        <div className="text-xs text-[var(--color-ink-mute)] mb-1.5">Speed</div>
        <div className="flex gap-1.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={clsx(
                "flex-1 text-xs font-semibold py-1.5 rounded-lg border transition",
                simulation.speed === s
                  ? "bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]"
                  : "border-[var(--color-line)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink-mute)]"
              )}
            >
              ×{s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-[var(--color-ink-mute)] mb-1.5">
          <span>Arrival rate</span>
          <span className="font-mono">{simulation.arrivalsPerHour}/hr</span>
        </div>
        <input
          type="range"
          min={4}
          max={60}
          value={simulation.arrivalsPerHour}
          onChange={(e) => setArrivalRate(Number(e.target.value))}
          className="w-full accent-[var(--color-emerald)]"
        />
      </div>
    </div>
  );
}
