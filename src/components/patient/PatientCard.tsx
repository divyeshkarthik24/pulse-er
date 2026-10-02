import { motion } from "framer-motion";
import { Clock, Siren, User } from "lucide-react";
import type { Patient } from "../../types";
import { SeverityBadge, StatusBadge } from "../common/Badge";
import clsx from "clsx";
import { useEffect, useState } from "react";

function useLiveWait(patient: Patient) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, Math.round((Date.now() - patient.arrivalTime) / 60000));
}

export function PatientCard({
  patient,
  rank,
  onSelect,
  selected,
  dense,
}: {
  patient: Patient;
  rank?: number;
  onSelect?: (p: Patient) => void;
  selected?: boolean;
  dense?: boolean;
}) {
  const waitMinutes = useLiveWait(patient);
  const isCritical = patient.severity === 1;

  return (
    <motion.div
      layout
      layoutId={patient.id}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      onClick={() => onSelect?.(patient)}
      className={clsx(
        "relative rounded-2xl border bg-[var(--color-surface)] cursor-pointer transition-shadow",
        dense ? "p-3" : "p-4",
        selected ? "border-[var(--color-emerald)] shadow-[var(--shadow-lift)]" : "border-[var(--color-line)] hover:shadow-[var(--shadow-soft)]",
        isCritical && "ring-1 ring-[var(--color-coral)]/30"
      )}
    >
      {isCritical && (
        <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-[var(--color-coral)] pulse-critical" />
      )}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {typeof rank === "number" && (
            <span className="font-mono text-xs h-6 w-6 flex items-center justify-center rounded-full bg-[var(--color-paper-dim)] text-[var(--color-ink-soft)] shrink-0">
              {rank}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold truncate">
              <User size={13} className="text-[var(--color-ink-mute)] shrink-0" />
              {patient.name}
              <span className="text-[var(--color-ink-mute)] font-mono text-xs font-normal">· {patient.id}</span>
            </div>
            <div className="text-xs text-[var(--color-ink-mute)] truncate">
              {patient.age}y {patient.gender} · {patient.symptoms.join(", ")}
            </div>
          </div>
        </div>
        {patient.isEmergency && <Siren size={15} className="text-[var(--color-coral)] shrink-0" />}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        <SeverityBadge severity={patient.severity} size="sm" />
        <StatusBadge status={patient.status} />
        {patient.department && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-paper-dim)] text-[var(--color-ink-soft)]">
            {patient.department}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)]">
        <div className="flex items-center gap-1">
          <Clock size={12} />
          Waiting {waitMinutes}m
        </div>
        <div className="font-mono font-semibold text-[var(--color-ink)]">
          score {Math.round(patient.priorityScore)}
        </div>
      </div>
    </motion.div>
  );
}
