import type { Doctor, Department, Patient } from "../types";
import { generateRandomPatient } from "./randomPatient";
import { resetSequenceCounters } from "../dsa/TriageEngine";

export const SEED_DOCTORS: Doctor[] = [
  { id: "D1", name: "Dr. Alisha Rao", specialty: "Emergency Medicine", department: "Emergency", available: true, patientsSeenToday: 7 },
  { id: "D2", name: "Dr. Marcus Webb", specialty: "Trauma Surgery", department: "Trauma", available: true, patientsSeenToday: 4 },
  { id: "D3", name: "Dr. Priya Nambiar", specialty: "Cardiology", department: "Cardiology", available: false, patientsSeenToday: 5 },
  { id: "D4", name: "Dr. Samuel Osei", specialty: "General Medicine", department: "General Medicine", available: true, patientsSeenToday: 9 },
  { id: "D5", name: "Dr. Lin Zhao", specialty: "Pediatrics", department: "Pediatrics", available: true, patientsSeenToday: 3 },
  { id: "D6", name: "Dr. Fatima Haidari", specialty: "Emergency Medicine", department: "Emergency", available: false, patientsSeenToday: 6 },
];

export const SEED_DEPARTMENTS: Department[] = [
  { id: "Emergency", name: "Emergency", roomsTotal: 6, roomsOccupied: 4 },
  { id: "Trauma", name: "Trauma", roomsTotal: 3, roomsOccupied: 1 },
  { id: "Cardiology", name: "Cardiology", roomsTotal: 4, roomsOccupied: 2 },
  { id: "General Medicine", name: "General Medicine", roomsTotal: 5, roomsOccupied: 2 },
  { id: "Pediatrics", name: "Pediatrics", roomsTotal: 3, roomsOccupied: 1 },
];

/**
 * Produces a realistic opening snapshot: a spread of severities, two
 * same-severity patients close in arrival time (to show fairness),
 * one long-waiting lower-severity patient (to show aging kick in
 * almost immediately on load), and one emergency-flagged case.
 */
export function buildSeedPatients(now: number): Patient[] {
  resetSequenceCounters(0, 100);
  const patients: Patient[] = [];

  const mk = (severity: 1 | 2 | 3 | 4 | 5, minutesAgo: number, isEmergency?: boolean) => {
    const p = generateRandomPatient({ severity, arrivalTime: now - minutesAgo * 60000 });
    if (isEmergency !== undefined) p.isEmergency = isEmergency;
    p.status = "queued";
    p.queuedAt = p.arrivalTime + 2 * 60000;
    patients.push(p);
    return p;
  };

  mk(1, 4, true); // fresh critical
  mk(2, 9); // urgent
  mk(3, 6); // moderate, arrived slightly after the one below (fairness demo)
  mk(3, 11); // same severity, arrived earlier -> should rank ahead normally
  mk(4, 42); // long-waiting stable patient -> aging should already be active
  mk(5, 14);
  mk(4, 3);
  mk(2, 2, true);

  return patients;
}

export const PRESENTATION_SPEED_OPTIONS = [1, 2, 5, 10] as const;
