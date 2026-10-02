import type { Doctor } from "../../types";
import { Card, SectionHeading } from "../common/Card";
import clsx from "clsx";

export function DoctorPanel({ doctors }: { doctors: Doctor[] }) {
  return (
    <Card>
      <SectionHeading
        eyebrow="Staffing"
        title="Doctor availability"
        action={
          <span className="text-sm font-mono text-[var(--color-ink-soft)]">
            {doctors.filter((d) => d.available).length}/{doctors.length} free
          </span>
        }
      />
      <div className="flex flex-col gap-2">
        {doctors.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-xl border border-[var(--color-line-soft)] px-3.5 py-2.5"
          >
            <div>
              <div className="text-sm font-medium">{d.name}</div>
              <div className="text-xs text-[var(--color-ink-mute)]">
                {d.specialty} · {d.department}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-ink-mute)] font-mono">{d.patientsSeenToday} seen</span>
              <span
                className={clsx(
                  "text-xs font-semibold px-2 py-1 rounded-full",
                  d.available
                    ? "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"
                    : "bg-[var(--color-amber-soft)] text-[var(--color-amber)]"
                )}
              >
                {d.available ? "Available" : "With patient"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
