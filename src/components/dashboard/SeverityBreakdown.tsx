import { motion } from "framer-motion";
import { SEVERITY_META, type SeverityLevel } from "../../types";
import { Card, SectionHeading } from "../common/Card";

export function SeverityBreakdown({ bySeverity }: { bySeverity: Record<SeverityLevel, number> }) {
  const data = ([1, 2, 3, 4, 5] as SeverityLevel[]).map((sev) => ({
    sev,
    name: SEVERITY_META[sev].label,
    value: bySeverity[sev],
    color: SEVERITY_META[sev].color,
  }));
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <Card>
      <SectionHeading eyebrow="Live breakdown" title="Patients by severity" />
      {total === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm text-[var(--color-ink-mute)]">
          No one waiting right now.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex h-3.5 w-full rounded-full overflow-hidden bg-[var(--color-paper-dim)]">
            {data
              .filter((d) => d.value > 0)
              .map((d) => (
                <motion.div
                  key={d.sev}
                  layout
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.value / total) * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: d.color }}
                  title={`${d.name}: ${d.value}`}
                />
              ))}
          </div>
          <div className="flex flex-col gap-2.5">
            {data.map((d) => (
              <div key={d.sev} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-[var(--color-ink-soft)]">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{d.value}</span>
                  <span className="text-xs text-[var(--color-ink-mute)] w-10 text-right">
                    {total ? Math.round((d.value / total) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
