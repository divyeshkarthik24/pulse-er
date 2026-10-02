import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SEVERITY_META, type SeverityLevel } from "../../types";

interface Blip {
  id: number;
  severity: SeverityLevel;
  label: string;
  score: number;
}

const POOL: { severity: SeverityLevel; label: string }[] = [
  { severity: 1, label: "Cardiac arrest" },
  { severity: 2, label: "Chest pain" },
  { severity: 3, label: "Fever" },
  { severity: 4, label: "Sprain" },
  { severity: 5, label: "Check-up" },
  { severity: 2, label: "Breathing difficulty" },
];

let uid = 0;

export function MiniHeapDemo() {
  const [items, setItems] = useState<Blip[]>([]);

  useEffect(() => {
    const seed = POOL.slice(0, 4).map((p) => ({ id: uid++, ...p, score: (6 - p.severity) * 100 + Math.random() * 20 }));
    setItems(sort(seed));

    const interval = setInterval(() => {
      setItems((prev) => {
        let next = prev.map((b) => ({ ...b, score: b.score + Math.random() * 6 }));
        if (Math.random() < 0.6 && next.length < 6) {
          const pick = POOL[Math.floor(Math.random() * POOL.length)];
          next = [...next, { id: uid++, ...pick, score: (6 - pick.severity) * 100 + Math.random() * 10 }];
        } else if (next.length > 3) {
          next = next.slice(1);
        }
        return sort(next);
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  function sort(arr: Blip[]) {
    return [...arr].sort((a, b) => b.score - a.score);
  }

  return (
    <div className="relative w-full max-w-sm">
      <div className="flex flex-col gap-2">
        {items.map((b, i) => {
          const meta = SEVERITY_META[b.severity];
          return (
            <motion.div
              key={b.id}
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-line)] px-3.5 py-2.5 shadow-[var(--shadow-soft)]"
            >
              <span className="font-mono text-xs text-[var(--color-ink-mute)] w-4">{i + 1}</span>
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: meta.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{b.label}</div>
                <div className="text-[11px] text-[var(--color-ink-mute)]">{meta.label}</div>
              </div>
              <div className="font-mono text-xs text-[var(--color-ink-soft)]">{Math.round(b.score)}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
