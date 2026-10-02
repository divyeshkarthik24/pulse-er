import { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { SEVERITY_META, type SeverityLevel, type VitalSigns } from "../../types";
import { TriageEngine } from "../../dsa/TriageEngine";
import { useERStore } from "../../store/useERStore";
import { useToastStore } from "../../store/useToastStore";
import clsx from "clsx";

const triageEngine = new TriageEngine();

const DEFAULT_VITALS: VitalSigns = {
  heartRate: 80,
  systolicBP: 118,
  diastolicBP: 76,
  spo2: 98,
  temperatureC: 36.8,
  respRate: 16,
};

export function RegistrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addPatient = useERStore((s) => s.addPatient);
  const pushToast = useToastStore((s) => s.push);

  const [name, setName] = useState("");
  const [age, setAge] = useState(34);
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [symptoms, setSymptoms] = useState("");
  const [vitals, setVitals] = useState<VitalSigns>(DEFAULT_VITALS);
  const [severity, setSeverity] = useState<SeverityLevel>(3);
  const [isEmergency, setIsEmergency] = useState(false);
  const [autoSuggested, setAutoSuggested] = useState(false);

  function updateVital<K extends keyof VitalSigns>(key: K, value: number) {
    const next = { ...vitals, [key]: value };
    setVitals(next);
    setAutoSuggested(false);
  }

  function suggest() {
    const s = triageEngine.suggestSeverity(vitals);
    setSeverity(s);
    setAutoSuggested(true);
  }

  function reset() {
    setName("");
    setAge(34);
    setGender("Male");
    setSymptoms("");
    setVitals(DEFAULT_VITALS);
    setSeverity(3);
    setIsEmergency(false);
    setAutoSuggested(false);
  }

  function submit() {
    if (!name.trim()) {
      pushToast({ title: "Name required", tone: "warning" });
      return;
    }
    const patient = addPatient({
      name: name.trim(),
      age,
      gender,
      symptoms: symptoms
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) || ["Unspecified complaint"],
      severity,
      vitals,
      isEmergency,
    });
    pushToast({
      title: `${patient.name} registered`,
      description: `Triaged as ${patient.triageCategory} · priority ${Math.round(patient.priorityScore)}`,
      tone: severity <= 2 ? "critical" : "success",
    });
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Register new patient" width="max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input type="number" className="input" value={age} min={0} max={120} onChange={(e) => setAge(Number(e.target.value))} />
          </Field>
          <Field label="Gender">
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>
        </div>
        <Field label="Symptoms (comma separated)" full>
          <input className="input" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Chest pain, shortness of breath" />
        </Field>

        <div className="sm:col-span-2 rounded-xl border border-[var(--color-line)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-mute)] mb-3">
            Vital signs
          </div>
          <div className="grid grid-cols-3 gap-3">
            <VitalInput label="Heart rate (bpm)" value={vitals.heartRate} onChange={(v) => updateVital("heartRate", v)} />
            <VitalInput label="Systolic BP" value={vitals.systolicBP} onChange={(v) => updateVital("systolicBP", v)} />
            <VitalInput label="SpO2 (%)" value={vitals.spo2} onChange={(v) => updateVital("spo2", v)} />
            <VitalInput label="Resp. rate" value={vitals.respRate} onChange={(v) => updateVital("respRate", v)} />
            <VitalInput
              label="Temp (°C)"
              value={vitals.temperatureC}
              step={0.1}
              onChange={(v) => updateVital("temperatureC", v)}
            />
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={suggest} className="w-full">
                Suggest severity
              </Button>
            </div>
          </div>
        </div>

        <Field label="Triage severity" full>
          <div className="grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5] as SeverityLevel[]).map((sev) => {
              const meta = SEVERITY_META[sev];
              return (
                <button
                  key={sev}
                  onClick={() => {
                    setSeverity(sev);
                    setAutoSuggested(false);
                  }}
                  className={clsx(
                    "rounded-xl border-2 py-2.5 text-xs font-semibold transition-all",
                    severity === sev ? "scale-[1.03]" : "opacity-70 hover:opacity-100"
                  )}
                  style={{
                    borderColor: severity === sev ? meta.color : "var(--color-line)",
                    color: meta.color,
                    background: severity === sev ? `color-mix(in srgb, ${meta.color} 10%, var(--color-surface))` : "transparent",
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          {autoSuggested && (
            <p className="text-xs text-[var(--color-emerald)] mt-1.5">Suggested from vitals — adjust if needed.</p>
          )}
        </Field>

        <label className="sm:col-span-2 flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} className="h-4 w-4 accent-[var(--color-coral)]" />
          Flag as emergency (adds an urgency bonus to the priority score)
        </label>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--color-line)]">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit}>
          Register &amp; queue patient
        </Button>
      </div>

      <style>{`.input { border:1px solid var(--color-line); background:var(--color-surface-raised); border-radius:10px; padding:8px 12px; font-size:14px; width:100%; outline:none; } .input:focus { border-color: var(--color-emerald); }`}</style>
    </Modal>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="text-xs font-medium text-[var(--color-ink-soft)] mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function VitalInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="text-[11px] text-[var(--color-ink-mute)] mb-1 block">{label}</label>
      <input
        type="number"
        step={step}
        className="input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
