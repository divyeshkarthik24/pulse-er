import { useRef } from "react";
import clsx from "clsx";
import type { EventLogEntry } from "../../types";

export function ReplayTimeline({
  events,
  currentIndex,
  onScrub,
}: {
  events: EventLogEntry[];
  currentIndex: number;
  onScrub: (index: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  if (events.length === 0) return null;

  const first = events[0].timestamp;
  const last = events[events.length - 1].timestamp;
  const span = Math.max(1, last - first);

  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const targetTime = first + ratio * span;
    let closest = 0;
    let closestDist = Infinity;
    events.forEach((ev, i) => {
      const d = Math.abs(ev.timestamp - targetTime);
      if (d < closestDist) {
        closestDist = d;
        closest = i;
      }
    });
    onScrub(closest);
  }

  const labelStops = 5;
  const labelTimes = Array.from({ length: labelStops }, (_, i) => first + (span * i) / (labelStops - 1));
  const hasConfigChange = events.some((ev) => ev.type === "config-changed");

  return (
    <div className="select-none">
      <div className="flex justify-between text-[10px] font-mono text-[var(--color-ink-mute)] mb-1.5 px-1">
        {labelTimes.map((t, i) => (
          <span key={i}>{new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        ))}
      </div>
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-10 rounded-full bg-[var(--color-paper-dim)] cursor-pointer"
      >
        <div className="absolute inset-y-0 left-0 right-0 flex items-center px-2">
          <div className="relative w-full h-0.5 bg-[var(--color-line)]">
            {events.map((ev, i) => {
              const left = `${((ev.timestamp - first) / span) * 100}%`;
              const active = i === currentIndex;
              const passed = i < currentIndex;
              const isConfigChange = ev.type === "config-changed";
              return (
                <button
                  key={ev.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onScrub(i);
                  }}
                  style={{ left }}
                  className={clsx(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all",
                    isConfigChange
                      ? "h-3.5 w-3.5 rotate-45 bg-[var(--color-amber)] ring-4 ring-[var(--color-amber-soft)]"
                      : clsx(
                          "rounded-full",
                          active
                            ? "h-3.5 w-3.5 bg-[var(--color-emerald)] ring-4 ring-[var(--color-emerald-soft)]"
                            : passed
                            ? "h-2 w-2 bg-[var(--color-emerald)]/50"
                            : "h-1.5 w-1.5 bg-[var(--color-ink-mute)]/50"
                        )
                  )}
                  title={isConfigChange ? `Configuration v${ev.configVersion} activated` : new Date(ev.timestamp).toLocaleTimeString()}
                />
              );
            })}
          </div>
        </div>
      </div>
      {hasConfigChange && (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[var(--color-ink-mute)]">
          <span className="h-2 w-2 rotate-45 bg-[var(--color-amber)] inline-block" />
          Scheduler configuration changed
        </div>
      )}
      <input
        type="range"
        min={0}
        max={events.length - 1}
        value={currentIndex}
        onChange={(e) => onScrub(Number(e.target.value))}
        className="w-full mt-2 accent-[var(--color-emerald)]"
        aria-label="Replay scrubber"
      />
    </div>
  );
}
