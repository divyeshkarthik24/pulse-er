import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FastForward, History, Pause, Play, Rewind, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useERStore } from "../store/useERStore";
import { createReplayEngine } from "../replay/QueueReplayEngine";
import { Card, SectionHeading } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { ReplayTimeline } from "../components/replay/ReplayTimeline";
import { WhatChangedPanel } from "../components/replay/WhatChangedPanel";
import { SchedulerConfigPanel } from "../components/replay/SchedulerConfigPanel";
import { HeapVisualizer } from "../components/queue/HeapVisualizer";
import { PatientCard } from "../components/patient/PatientCard";

const SPEEDS = [0.5, 1, 2, 5, 10] as const;

export function QueueReplayPage() {
  const rawEventLog = useERStore((s) => s.eventLog);
  const patients = useERStore((s) => s.patients);
  const configHistory = useERStore((s) => s.configHistory);

  // Stored newest-first; replay wants chronological order.
  const events = useMemo(() => [...rawEventLog].reverse(), [rawEventLog]);
  const engine = useMemo(() => createReplayEngine(), []);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);

  useEffect(() => {
    // Keep the scrubber pinned to the latest event as new ones arrive, unless the user is mid-playback/scrub.
    if (!playing) setIndex(events.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  useEffect(() => {
    if (!playing) return;
    if (index >= events.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setIndex((i) => Math.min(i + 1, events.length - 1)), 700 / speed);
    return () => clearTimeout(id);
  }, [playing, index, speed, events.length]);

  const frame = useMemo(() => {
    if (events.length === 0) return undefined;
    return engine.buildFrame(patients, events, index, configHistory);
  }, [engine, patients, events, index, configHistory]);

  const heapArray = useMemo(() => (frame ? engine.buildHeapArray(frame.waitingQueue) : []), [engine, frame]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2.5">
            <History className="text-[var(--color-emerald)]" /> Queue Replay
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            Scrub through everything that happened this session — reconstructed from real patient timestamps, not stored snapshots.
          </p>
        </div>
        <Link to="/app/dsa/stepper" className="text-sm text-[var(--color-emerald)] font-medium hover:underline">
          Open Heap Stepper →
        </Link>
      </div>

      {events.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-ink-mute)] text-center py-10">
            No events recorded yet — go register a patient or run the simulation, then come back.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <SectionHeading eyebrow={`Event ${index + 1} / ${events.length}`} title="Timeline" />
            <ReplayTimeline events={events} currentIndex={index} onScrub={(i) => { setPlaying(false); setIndex(i); }} />
            <div className="flex items-center justify-between flex-wrap gap-3 mt-5">
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => { setPlaying(false); setIndex(0); }} title="Restart">
                  <RotateCcw size={15} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setPlaying(false); setIndex((i) => Math.max(0, i - 1)); }}>
                  <SkipBack size={14} /> Previous
                </Button>
                {playing ? (
                  <Button variant="secondary" size="sm" onClick={() => setPlaying(false)}>
                    <Pause size={14} /> Pause
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setPlaying(true)}>
                    <Play size={14} /> Play
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setPlaying(false); setIndex((i) => Math.min(events.length - 1, i + 1)); }}
                >
                  Next <SkipForward size={14} />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Rewind size={13} className="text-[var(--color-ink-mute)]" />
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
                <FastForward size={13} className="text-[var(--color-ink-mute)]" />
              </div>
            </div>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card>
                <SectionHeading
                  eyebrow="Reconstructed"
                  title="Heap at this instant"
                  description="Rebuilt from each patient's real timestamps and the live scoring formula — not a recorded snapshot."
                />
                <HeapVisualizer heapArray={heapArray} ops={[]} />
              </Card>
              <Card>
                <SectionHeading eyebrow={`${frame?.queueSize ?? 0} waiting`} title="Queue at this instant" />
                <div className="grid sm:grid-cols-2 gap-3">
                  {frame?.waitingQueue.slice(0, 8).map((p, i) => (
                    <PatientCard key={p.id} patient={p} rank={i + 1} dense />
                  ))}
                  {frame && frame.waitingQueue.length === 0 && (
                    <div className="col-span-2 text-center text-sm text-[var(--color-ink-mute)] py-6">
                      No one was waiting at this instant.
                    </div>
                  )}
                </div>
              </Card>
            </div>
            <div className="flex flex-col gap-6">
              <WhatChangedPanel event={frame?.event} />
              {configHistory.length > 1 && <SchedulerConfigPanel config={frame?.config} />}
              <Card padding="sm" className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-[var(--color-ink-soft)]">Critical waiting</span>
                <span className="font-mono text-sm font-semibold text-[var(--color-coral)]">{frame?.criticalWaiting ?? 0}</span>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
