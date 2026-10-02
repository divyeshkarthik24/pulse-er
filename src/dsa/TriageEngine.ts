import { REGISTRATION_VARIANCE_MAX, SEVERITY_META, type Patient, type SeverityLevel, type VitalSigns } from "../types";

let sequenceCounter = 0;
let idCounter = 100;

export function resetSequenceCounters(seedSequence = 0, seedId = 100) {
  sequenceCounter = seedSequence;
  idCounter = seedId;
}

export function nextPatientId(): string {
  idCounter += 1;
  return `P${idCounter}`;
}

export function nextArrivalSequence(): number {
  sequenceCounter += 1;
  return sequenceCounter;
}

export interface NewPatientInput {
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  symptoms: string[];
  severity: SeverityLevel;
  vitals: VitalSigns;
  isEmergency: boolean;
  arrivalTime?: number;
}

/**
 * Builds a fully-formed Patient record from raw registration/triage input.
 * The triage category text and estimated treatment time are derived
 * deterministically from severity so the UI never has to hardcode them.
 */
export class TriageEngine {
  createPatient(input: NewPatientInput): Patient {
    const arrivalTime = input.arrivalTime ?? Date.now();
    const id = nextPatientId();
    return {
      id,
      name: input.name,
      age: input.age,
      gender: input.gender,
      symptoms: input.symptoms,
      severity: input.severity,
      triageCategory: SEVERITY_META[input.severity].label,
      vitals: input.vitals,
      isEmergency: input.isEmergency,
      status: "registered",
      arrivalTime,
      arrivalSequence: nextArrivalSequence(),
      registrationVariance: Math.random() * REGISTRATION_VARIANCE_MAX,
      estimatedTreatmentMinutes: this.estimateTreatmentMinutes(input.severity),
      priorityScore: 0,
      priorityBreakdown: {
        severityBase: 0,
        waitMinutes: 0,
        waitFactor: 0,
        agingBonus: 0,
        agingActive: false,
        emergencyModifier: 0,
        registrationVariance: 0,
        tieBreaker: 0,
        finalScore: 0,
        computedAt: arrivalTime,
      },
      escalationCount: 0,
      severityHistory: [{ severity: input.severity, at: arrivalTime, reason: "Initial triage" }],
    };
  }

  estimateTreatmentMinutes(severity: SeverityLevel): number {
    const base: Record<SeverityLevel, [number, number]> = {
      1: [35, 70],
      2: [25, 50],
      3: [15, 35],
      4: [10, 25],
      5: [5, 15],
    };
    const [min, max] = base[severity];
    return Math.round(min + Math.random() * (max - min));
  }

  /** Suggests a severity level from vitals — a light heuristic, not a clinical tool. */
  suggestSeverity(vitals: VitalSigns): SeverityLevel {
    let score = 0;
    if (vitals.spo2 < 90) score += 3;
    else if (vitals.spo2 < 95) score += 1;
    if (vitals.heartRate > 130 || vitals.heartRate < 45) score += 2;
    else if (vitals.heartRate > 110 || vitals.heartRate < 55) score += 1;
    if (vitals.systolicBP < 90 || vitals.systolicBP > 190) score += 2;
    if (vitals.respRate > 28 || vitals.respRate < 9) score += 2;
    if (vitals.temperatureC > 39.5 || vitals.temperatureC < 35) score += 1;

    if (score >= 5) return 1;
    if (score >= 3) return 2;
    if (score >= 2) return 3;
    if (score >= 1) return 4;
    return 5;
  }

  escalate(patient: Patient, newSeverity: SeverityLevel, reason: string, now: number): Patient {
    patient.severityHistory.push({ severity: newSeverity, at: now, reason });
    patient.severity = newSeverity;
    patient.triageCategory = SEVERITY_META[newSeverity].label;
    patient.escalationCount += 1;
    return patient;
  }
}
