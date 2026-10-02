import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, Siren, X } from "lucide-react";
import { useToastStore } from "../../store/useToastStore";

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  critical: Siren,
};

const TONE_COLOR: Record<string, string> = {
  success: "var(--color-emerald)",
  info: "var(--color-teal)",
  warning: "var(--color-amber)",
  critical: "var(--color-coral)",
};

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 w-[min(360px,calc(100vw-2.5rem))]">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          const color = TONE_COLOR[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel rounded-xl shadow-[var(--shadow-glass)] p-3.5 flex items-start gap-3"
            >
              <Icon size={18} style={{ color }} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--color-ink)]">{t.title}</div>
                {t.description && (
                  <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">{t.description}</div>
                )}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
