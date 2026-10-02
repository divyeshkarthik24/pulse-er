import { AnimatePresence, motion } from "framer-motion";
import type { EventLogEntry, EventType } from "../../types";
import {
  ArrowUpCircle,
  Clock3,
  Dna,
  DoorOpen,
  Gauge,
  HeartPulse,
  LayoutList,
  Settings2,
  Siren,
  Stethoscope,
  TimerReset,
  UserPlus,
} from "lucide-react";

const ICONS: Record<EventType, typeof UserPlus> = {
  arrival: UserPlus,
  "triage-complete": Stethoscope,
  "priority-calculated": Gauge,
  "heap-insert": LayoutList,
  "heap-reorder": LayoutList,
  "priority-updated": TimerReset,
  "aging-applied": Clock3,
  "position-change": ArrowUpCircle,
  escalation: Siren,
  "doctor-assigned": HeartPulse,
  "treatment-start": Dna,
  "treatment-complete": Stethoscope,
  discharge: DoorOpen,
  simulation: Gauge,
  "config-changed": Settings2,
};

const COLORS: Partial<Record<EventType, string>> = {
  escalation: "var(--color-coral)",
  "position-change": "var(--color-amber)",
  "doctor-assigned": "var(--color-teal)",
  "treatment-complete": "var(--color-emerald)",
  arrival: "var(--color-steel)",
  "config-changed": "var(--color-emerald)",
};

export function EventTimeline({ events, limit = 30 }: { events: EventLogEntry[]; limit?: number }) {
  const list = events.slice(0, limit);
  return (
    <div className="flex flex-col max-h-[520px] overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {list.map((e) => {
          const Icon = ICONS[e.type] ?? LayoutList;
          const color = COLORS[e.type] ?? "var(--color-ink-mute)";
          return (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 py-2 border-b border-[var(--color-line-soft)] last:border-0"
            >
              <div className="flex flex-col items-center">
                <span
                  className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
                >
                  <Icon size={12} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[var(--color-ink-mute)] font-mono">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
                <div className="text-sm text-[var(--color-ink)] leading-snug">{e.message}</div>
                {e.detail && <div className="text-xs text-[var(--color-ink-mute)] mt-0.5">{e.detail}</div>}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {list.length === 0 && (
        <div className="text-sm text-[var(--color-ink-mute)] text-center py-8">No events yet.</div>
      )}
    </div>
  );
}
