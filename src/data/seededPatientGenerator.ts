import { REGISTRATION_VARIANCE_MAX, type Patient, type SeverityLevel } from "../types";
import { generateRandomPatient } from "./randomPatient";

/**
 * Deterministic PRNG (mulberry32). Shared by the Algorithm Duel engine and
 * the Demo Scenario builder — anywhere the app needs "the same inputs
 * every time this seed is used," not just "random-looking" data.
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SERVICE_MINUTES_RANGE: Record<SeverityLevel, [number, number]> = {
  1: [35, 70],
  2: [25, 50],
  3: [15, 35],
  4: [10, 25],
  5: [5, 15],
};

export interface SeededPatientSpec {
  severity: SeverityLevel;
  arrivalMinutesAgo: number;
  isEmergency?: boolean;
}

/**
 * Builds one patient whose every *scheduling-relevant* field (severity,
 * arrival time, emergency flag, intake variance, service duration) is
 * derived from the given seeded `rand()` — so the same seed always
 * reproduces the same scheduling outcome. Cosmetic fields (name, vitals,
 * symptoms) still come from the normal generator and may vary, since they
 * never feed into any scheduling decision.
 */
export function generateSeededPatient(rand: () => number, spec: SeededPatientSpec, now: number): Patient {
  const p = generateRandomPatient({ severity: spec.severity, arrivalTime: now - spec.arrivalMinutesAgo * 60000 });
  p.isEmergency = spec.isEmergency ?? false;
  p.registrationVariance = Math.round(rand() * REGISTRATION_VARIANCE_MAX * 10) / 10;
  const [min, max] = SERVICE_MINUTES_RANGE[spec.severity];
  p.estimatedTreatmentMinutes = Math.round(min + rand() * (max - min));
  p.status = "queued";
  p.queuedAt = p.arrivalTime;
  return p;
}

/** Builds a full deterministic list and fixes up arrival-sequence to match chronological order, as the Duel engine does. */
export function generateSeededPatients(seed: number, specs: SeededPatientSpec[], now: number): Patient[] {
  const rand = mulberry32(seed);
  const patients = specs.map((spec) => generateSeededPatient(rand, spec, now));
  patients.sort((a, b) => a.arrivalTime - b.arrivalTime);
  patients.forEach((p, i) => {
    p.arrivalSequence = i + 1;
  });
  return patients;
}
