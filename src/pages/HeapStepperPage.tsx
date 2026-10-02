import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FlaskConical,
  Pause,
  Play,
  Plus,
  Rewind as SpeedIcon,
  RotateCcw,
  Siren,
  SkipBack,
  SkipForward,
  Timer,
  Trash2,
} from "lucide-react";
import { useHeapStepperStore } from "../store/useHeapStepperStore";
import { HeapVisualizer } from "../components/queue/HeapVisualizer";
import { HeapStepTimeline } from "../components/stepper/HeapStepTimeline";
import { Card, SectionHeading } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { HEAP_PHASE_LABEL, type Patient, type SeverityLevel } from "../types";

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function HeapStepperPage() {
  const {
    patients,
    preState,
    steps,
    opLabel,
    stepIndex,
    playing,
    speed,
    seed,
    insertRandom,
    extractMax,
    peek,
    rescoreAging,
    reset,
    setStepIndex,
    stepNext,
    stepPrev,
    skipToEnd,
    restart,
    play,
    pause,
    setSpeed,
  } = useHeapStepperStore();

  useEffect(() => {
    if (Object.keys(patients).length === 0) seed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= steps.length) {
      pause();
      return;
    }
    const id = setTimeout(() => stepNext(), 900 / speed);
    return () => clearTimeout(id);
  }, [playing, stepIndex, steps.length, speed, stepNext, pause]);

  const idsAtStep = stepIndex === 0 ? preState : steps[stepIndex - 1]?.snapshot ?? preState;
  const heapArray: Patient[] = useMemo(() => idsAtStep.map((id) => patients[id]).filter(Boolean), [idsAtStep, patients]);
  const currentStep = stepIndex > 0 ? steps[stepIndex - 1] : undefined;
  const activeOps = currentStep ? [currentStep] : [];

  const comparisons = steps.slice(0, stepIndex).filter((s) => s.type === "compare").length;
  const swaps = steps.slice(0, stepIndex).filter((s) => s.type === "swap").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2.5">
            <FlaskConical className="text-[var(--color-emerald)]" /> Heap Operation Stepper
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            Every compare and swap below is a real op recorded by the actual <code>MaxHeap</code> — nothing here is staged.
          </p>
        </div>
        <Link to="/app/lab" className="text-sm text-[var(--color-emerald)] font-medium hover:underline">
          Open Algorithm Lab →
        </Link>
      </div>

      <Card>
        <SectionHeading eyebrow="Trigger an operation" title="Try it" />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => insertRandom()}>
            <Plus size={14} /> Insert random patient
          </Button>
          <Button variant="outline" size="sm" onClick={() => insertRandom(1 as SeverityLevel)}>
            <Siren size={14} /> Insert critical patient
          </Button>
          <Button variant="secondary" size="sm" onClick={extractMax}>
            <Trash2 size={14} /> Extract max
          </Button>
          <Button variant="secondary" size="sm" onClick={peek}>
            Peek (O(1))
          </Button>
          <Button variant="secondary" size="sm" onClick={() => rescoreAging(25)}>
            <Timer size={14} /> Advance 25 min (rescore)
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw size={14} /> Reset
          </Button>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <SectionHeading
              eyebrow={opLabel || "Idle"}
              title="Heap state at this step"
              description="Highlighted nodes show the current step's comparison or swap."
            />
            <HeapVisualizer heapArray={heapArray} ops={activeOps} />
          </Card>

          {currentStep && (
            <Card glass>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-emerald)] mb-2">
                {HEAP_PHASE_LABEL[currentStep.phase]}
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-ink)]">{currentStep.note}</p>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={restart} title="Restart">
                  <RotateCcw size={14} />
                </Button>
                <Button variant="outline" size="sm" onClick={stepPrev} disabled={stepIndex === 0}>
                  <SkipBack size={14} /> Previous
                </Button>
                {playing ? (
                  <Button variant="secondary" size="sm" onClick={pause}>
                    <Pause size={14} /> Pause
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={play} disabled={stepIndex >= steps.length}>
                    <Play size={14} /> Play
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={stepNext} disabled={stepIndex >= steps.length}>
                  Next <SkipForward size={14} />
                </Button>
                <Button variant="ghost" size="sm" onClick={skipToEnd}>
                  Skip to End
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <SpeedIcon size={13} className="text-[var(--color-ink-mute)]" />
                {SPEEDS.map((s) => (
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[var(--color-line)]">
              <Stat label="Step" value={`${stepIndex} / ${steps.length}`} />
              <Stat label="Comparisons" value={String(comparisons)} />
              <Stat label="Swaps" value={String(swaps)} />
              <Stat label="Heap size" value={String(heapArray.length)} />
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <SectionHeading eyebrow="Operation log" title="Step by step" />
            <HeapStepTimeline steps={steps} stepIndex={stepIndex} onJump={setStepIndex} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-mute)] mb-0.5">{label}</div>
      <div className="font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}
