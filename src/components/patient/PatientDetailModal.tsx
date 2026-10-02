import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { SeverityBadge, StatusBadge } from "../common/Badge";
import { ExplainabilityPanel } from "../explain/ExplainabilityPanel";
import { SEVERITY_META, type Patient, type SeverityLevel } from "../../types";
import { useERStore } from "../../store/useERStore";
import { useToastStore } from "../../store/useToastStore";
import clsx from "clsx";

export function PatientDetailModal({ patient, onClose }: { patient: Patient | undefined; onClose: () => void }) {
  const escalate = useERStore((s) => s.escalatePatient);
  const pushToast = useToastStore((s) => s.push);

  if (!patient) return <Modal open={false} onClose={onClose}>{null}</Modal>;

  function handleEscalate(newSeverity: SeverityLevel) {
    if (!patient || newSeverity === patient.severity) return;
    const worsened = newSeverity < patient.severity;
    escalate(patient.id, newSeverity, worsened ? "Condition worsened" : "Condition improved on reassessment");
    pushToast({
      title: "Priority recalculated",
      description: `${patient.name} moved to ${SEVERITY_META[newSeverity].label}.`,
      tone: worsened ? "critical" : "info",
    });
  }

  return (
    <Modal open={!!patient} onClose={onClose} title={`Patient ${patient.id}`} width="max-w-2xl">
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h3 className="font-display text-xl mb-1">{patient.name}</h3>
          <p className="text-sm text-[var(--color-ink-soft)] mb-3">
            {patient.age}y · {patient.gender} · {patient.department}
          </p>
          <div className="flex gap-2 mb-4">
            <SeverityBadge severity={patient.severity} />
            <StatusBadge status={patient.status} />
          </div>

          <div className="rounded-xl border border-[var(--color-line)] p-4 mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-mute)] mb-2">
              Symptoms
            </div>
            <p className="text-sm">{patient.symptoms.join(", ")}</p>
          </div>

          <div className="rounded-xl border border-[var(--color-line)] p-4 mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-mute)] mb-2">
              Vital signs
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <span className="text-[var(--color-ink-soft)]">Heart rate</span>
              <span className="font-mono">{patient.vitals.heartRate} bpm</span>
              <span className="text-[var(--color-ink-soft)]">Blood pressure</span>
              <span className="font-mono">
                {patient.vitals.systolicBP}/{patient.vitals.diastolicBP}
              </span>
              <span className="text-[var(--color-ink-soft)]">SpO2</span>
              <span className="font-mono">{patient.vitals.spo2}%</span>
              <span className="text-[var(--color-ink-soft)]">Resp. rate</span>
              <span className="font-mono">{patient.vitals.respRate}/min</span>
              <span className="text-[var(--color-ink-soft)]">Temperature</span>
              <span className="font-mono">{patient.vitals.temperatureC}°C</span>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-line)] p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-mute)] mb-2">
              Simulate condition change
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {([1, 2, 3, 4, 5] as SeverityLevel[]).map((sev) => {
                const meta = SEVERITY_META[sev];
                return (
                  <button
                    key={sev}
                    onClick={() => handleEscalate(sev)}
                    disabled={patient.status !== "queued"}
                    className={clsx(
                      "rounded-lg border-2 py-2 text-[10px] font-semibold transition disabled:opacity-30",
                      patient.severity === sev ? "scale-[1.03]" : "opacity-70 hover:opacity-100"
                    )}
                    style={{
                      borderColor: patient.severity === sev ? meta.color : "var(--color-line)",
                      color: meta.color,
                    }}
                  >
                    {meta.short}
                  </button>
                );
              })}
            </div>
            {patient.status !== "queued" && (
              <p className="text-[11px] text-[var(--color-ink-mute)] mt-2">
                Only waiting patients can be re-triaged.
              </p>
            )}
            {patient.escalationCount > 0 && (
              <p className="text-[11px] text-[var(--color-ink-mute)] mt-2">
                Re-triaged {patient.escalationCount} time{patient.escalationCount > 1 ? "s" : ""} since arrival.
              </p>
            )}
          </div>
        </div>

        <ExplainabilityPanel patient={patient} />
      </div>
      <div className="flex justify-end mt-5">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
