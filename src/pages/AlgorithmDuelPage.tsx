import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { GitCompareArrows, Pause, Play, RotateCcw, Scale, Swords } from "lucide-react";
import { useDuelStore } from "../store/useDuelStore";
import { Card, SectionHeading } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { DuelQueuePanel } from "../components/duel/DuelQueuePanel";
import { StrategyComparisonChart } from "../components/analytics/StrategyComparisonChart";
import { buildDuelInterpretation } from "../analytics/AlgorithmDuelEngine";
import { DUEL_STRATEGIES } from "../analytics/algorithmComparison";
import type { DuelStrategyKey } from "../types";

export function AlgorithmDuelPage() {
  const {
    config,
    dataset,
    result,
    framesByStrategy,
    step,
    playing,
    speed,
    run,
    reset,
    setConfig,
    setStep,
    play,
    pause,
    setSpeed,
  } = useDuelStore();

  useEffect(() => {
    if (!result) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxStep = dataset.length;

  useEffect(() => {
    if (!playing) return;
    if (step >= maxStep) {
      pause();
      return;
    }
    const id = setTimeout(() => setStep(step + 1), 900 / speed);
    return () => clearTimeout(id);
  }, [playing, step, maxStep, speed, setStep, pause]);

  const patientsById = useMemo(() => new Map(dataset.map((p) => [p.id, p])), [dataset]);
  const initialOrder = useMemo(() => [...dataset].sort((a, b) => a.arrivalTime - b.arrivalTime).map((p) => p.id), [dataset]);

  function panelFor(strategy: DuelStrategyKey) {
    if (step === 0) return { waitingIds: initialOrder, servedId: undefined };
    const frames = framesByStrategy[strategy];
    const frame = frames[Math.min(step, frames.length) - 1];
    return { waitingIds: frame?.waitingOrder ?? [], servedId: frame?.servedId };
  }

  const interpretation = result ? buildDuelInterpretation(result) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2.5">
            <Swords className="text-[var(--color-emerald)]" /> Algorithm Duel
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            One cloned scenario (seed #{config.seed}), run through FIFO, Priority Queue, and Priority + Aging side by side.
          </p>
        </div>
        <Link to="/app/dsa/fairness" className="text-sm text-[var(--color-emerald)] font-medium hover:underline">
          Inspect Fairness →
        </Link>
      </div>

      <Card>
        <SectionHeading eyebrow="Same input, every time" title="Scenario configuration" />
        <div className="grid sm:grid-cols-4 gap-4 mb-4">
          <Field label="Patients">
            <input
              type="number"
              min={6}
              max={60}
              value={config.patientCount}
              onChange={(e) => setConfig({ patientCount: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Doctors (servers)">
            <input
              type="number"
              min={1}
              max={6}
              value={config.numServers}
              onChange={(e) => setConfig({ numServers: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Arrival span (min)">
            <input
              type="number"
              min={30}
              max={600}
              step={10}
              value={config.arrivalSpanMinutes}
              onChange={(e) => setConfig({ arrivalSpanMinutes: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Scenario seed">
            <input
              type="number"
              value={config.seed}
              onChange={(e) => setConfig({ seed: Number(e.target.value) })}
              className="input"
            />
          </Field>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primary" size="sm" onClick={run}>
            <Swords size={14} /> Start Duel
          </Button>
          {playing ? (
            <Button variant="secondary" size="sm" onClick={pause}>
              <Pause size={14} /> Pause
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={play} disabled={step >= maxStep}>
              <Play size={14} /> Resume
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
            <RotateCcw size={14} /> Replay
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
          <div className="flex items-center gap-1 ml-auto">
            {([1, 2, 5, 10] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
                  speed === s
                    ? "bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]"
                    : "border-[var(--color-line)] text-[var(--color-ink-soft)]"
                }`}
              >
                ×{s}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {dataset.length > 0 && (
        <>
          <Card>
            <SectionHeading
              eyebrow={`Step ${step} / ${maxStep}`}
              title="Same scenario → three outcomes"
              description="Identical arrivals, severities, emergency flags, and treatment durations — only the scheduling policy differs."
            />
            <div className="grid md:grid-cols-3 gap-4">
              {DUEL_STRATEGIES.map(({ key, label }) => {
                const panel = panelFor(key);
                return (
                  <DuelQueuePanel
                    key={key}
                    label={label}
                    strategy={key}
                    waitingIds={panel.waitingIds}
                    servedId={panel.servedId}
                    patientsById={patientsById}
                  />
                );
              })}
            </div>
            <input
              type="range"
              min={0}
              max={maxStep}
              value={step}
              onChange={(e) => {
                pause();
                setStep(Number(e.target.value));
              }}
              className="w-full mt-4 accent-[var(--color-emerald)]"
            />
          </Card>

          {result && (
            <Card>
              <SectionHeading eyebrow="Measured, not assumed" title="Metrics" />
              <StrategyComparisonChart results={result.results} />
            </Card>
          )}

          {interpretation.length > 0 && (
            <Card glass>
              <SectionHeading eyebrow="Result explanation" title="What actually happened" icon={<Scale size={18} />} />
              <ul className="flex flex-col gap-2.5 text-sm text-[var(--color-ink-soft)]">
                {interpretation.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <GitCompareArrows size={14} className="mt-0.5 shrink-0 text-[var(--color-emerald)]" />
                    {line}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <style>{`.input { border:1px solid var(--color-line); background:var(--color-surface-raised); border-radius:10px; padding:8px 12px; font-size:14px; width:100%; outline:none; } .input:focus { border-color: var(--color-emerald); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
