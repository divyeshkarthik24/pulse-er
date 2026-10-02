import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import type { EventLogEntry } from "../../types";

export function WhatChangedPanel({ event }: { event: EventLogEntry | undefined }) {
  if (!event) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-ink-mute)]">
        Scrub the timeline to inspect an event.
      </div>
    );
  }

  return (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={15} className="text-[var(--color-emerald)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-emerald)]">
          What changed?
        </span>
      </div>
      {event.patientLabel && <h3 className="font-display text-lg mb-1">{event.patientLabel}</h3>}
      <div className="text-xs text-[var(--color-ink-mute)] font-mono mb-3">
        {new Date(event.timestamp).toLocaleTimeString()}
      </div>
      <p className="text-sm text-[var(--color-ink-soft)] mb-4">{event.message}</p>

      {event.changes && event.changes.length > 0 ? (
        <div className="flex flex-col gap-2">
          {event.changes.map((c) => (
            <div key={c.label} className="flex items-center justify-between rounded-xl bg-[var(--color-paper-dim)] px-3.5 py-2.5">
              <span className="text-xs font-medium text-[var(--color-ink-mute)]">{c.label}</span>
              <div className="flex items-center gap-2 font-mono text-sm">
                <span className="text-[var(--color-ink-soft)]">{c.before}</span>
                <ArrowRight size={13} className="text-[var(--color-ink-mute)]" />
                <span className="font-semibold text-[var(--color-emerald)]">{c.after}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        event.detail && (
          <div className="text-xs text-[var(--color-ink-mute)] bg-[var(--color-paper-dim)] rounded-xl p-3">
            {event.detail}
          </div>
        )
      )}
    </motion.div>
  );
}
