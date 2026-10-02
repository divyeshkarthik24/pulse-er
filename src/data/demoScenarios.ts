import type { Department, Doctor, Patient, SeverityLevel } from "../types";
import { generateSeededPatients, mulberry32, type SeededPatientSpec } from "./seededPatientGenerator";
import { buildFairnessScenario } from "../fairness/FairnessChallengeEngine";
import { DEFAULT_DUEL_CONFIG, generateDuelDataset } from "../analytics/AlgorithmDuelEngine";
import { SEED_DEPARTMENTS, SEED_DOCTORS } from "./seedData";

export type DemoScenarioKey =
  | "normal"
  | "critical-surge"
  | "fairness-test"
  | "starvation-test"
  | "algorithm-comparison"
  | "overcrowded";

export interface DemoScenarioMeta {
  key: DemoScenarioKey;
  label: string;
  description: string;
}

export const DEMO_SCENARIOS: DemoScenarioMeta[] = [
  { key: "normal", label: "Normal ER", description: "Balanced patients and resources — the default opening state." },
  { key: "critical-surge", label: "Critical Surge", description: "Several urgent/critical arrivals at once — heap pressure and Queue Health response." },
  { key: "fairness-test", label: "Fairness Test", description: "Constructed same-severity patients for a clean aging / before-after demonstration." },
  { key: "starvation-test", label: "Starvation Test", description: "A long-waiting low-severity patient repeatedly passed over — starvation prevention in action." },
  { key: "algorithm-comparison", label: "Algorithm Comparison", description: "The exact dataset Algorithm Duel expects, loaded into the live queue too." },
  { key: "overcrowded", label: "Overcrowded ER", description: "High arrival volume, low treatment capacity — congestion and capacity alerts." },
];

export interface DemoScenarioResult {
  patients: Patient[];
  doctors: Doctor[];
  departments: Department[];
}

function withRoomsOccupied(departments: Department[], occupiedByDept: Record<string, number>): Department[] {
  return departments.map((d) => ({ ...d, roomsOccupied: occupiedByDept[d.id] ?? d.roomsOccupied }));
}

function withDoctorsAvailable(doctors: Doctor[], availableIds: Set<string>): Doctor[] {
  return doctors.map((d) => ({ ...d, available: availableIds.has(d.id), currentPatientId: undefined }));
}

const SERVICE_MINUTES_RANGE: Record<SeverityLevel, [number, number]> = {
  1: [35, 70],
  2: [25, 50],
  3: [15, 35],
  4: [10, 25],
  5: [5, 15],
};

/**
 * `buildFairnessScenario` (reused here, not modified) deliberately keeps
 * treatment duration out of its own determinism contract since it's
 * irrelevant to the fairness demonstration itself — but the demo-scenario
 * contract promises fully reproducible service times too, so this
 * overrides that one field deterministically from a local seed without
 * touching the (already tested) Fairness Challenge engine.
 */
function withDeterministicServiceTimes(patients: Patient[], seed: number): Patient[] {
  const rand = mulberry32(seed);
  patients.forEach((p) => {
    const [min, max] = SERVICE_MINUTES_RANGE[p.severity];
    p.estimatedTreatmentMinutes = Math.round(min + rand() * (max - min));
  });
  return patients;
}

/**
 * `buildFairnessScenario` assigns ids/arrival-sequence from TriageEngine's
 * shared, ever-incrementing module-level counter (by design — it's meant
 * to behave like "real" patient registration). That's fine for the
 * Fairness Challenge page itself, but it means the *sequence numbers*
 * (not the severities or arrival times) can differ between two loads of
 * the same demo scenario. Since arrival sequence only exists to break
 * exact ties in arrival order, this re-derives it from the one thing that
 * actually matters — relative arrival time — making the scenario fully
 * reproducible without touching the Fairness Challenge engine itself.
 */
function withDeterministicArrivalSequence(patients: Patient[]): Patient[] {
  const sorted = [...patients].sort((a, b) => a.arrivalTime - b.arrivalTime);
  sorted.forEach((p, i) => {
    p.arrivalSequence = i + 1;
  });
  return patients;
}

/**
 * Every scenario is built from a fixed seed and a fixed list of
 * {severity, arrivalMinutesAgo, isEmergency} specs — no scenario ever
 * calls `Math.random()` directly, so loading the same scenario twice
 * (via `seededPatientGenerator`) produces the same patients, arrival
 * times, severities, emergency flags, variance, and service times.
 */
export function buildDemoScenario(key: DemoScenarioKey, now: number): DemoScenarioResult {
  const doctors = SEED_DOCTORS.map((d) => ({ ...d, patientsSeenToday: 0 }));
  const departments = SEED_DEPARTMENTS.map((d) => ({ ...d }));

  switch (key) {
    case "normal": {
      const specs: SeededPatientSpec[] = [
        { severity: 1, arrivalMinutesAgo: 4, isEmergency: true },
        { severity: 2, arrivalMinutesAgo: 9 },
        { severity: 3, arrivalMinutesAgo: 6 },
        { severity: 3, arrivalMinutesAgo: 11 },
        { severity: 4, arrivalMinutesAgo: 20 },
        { severity: 5, arrivalMinutesAgo: 14 },
        { severity: 4, arrivalMinutesAgo: 3 },
        { severity: 2, arrivalMinutesAgo: 2, isEmergency: true },
      ];
      return {
        patients: generateSeededPatients(1001, specs, now),
        doctors: withDoctorsAvailable(doctors, new Set(["D1", "D2", "D4", "D5"])),
        departments: withRoomsOccupied(departments, { Emergency: 2, Trauma: 1, Cardiology: 1, "General Medicine": 1, Pediatrics: 0 }),
      };
    }

    case "critical-surge": {
      const specs: SeededPatientSpec[] = [
        { severity: 1, arrivalMinutesAgo: 2, isEmergency: true },
        { severity: 1, arrivalMinutesAgo: 5, isEmergency: true },
        { severity: 1, arrivalMinutesAgo: 8, isEmergency: true },
        { severity: 2, arrivalMinutesAgo: 3, isEmergency: true },
        { severity: 2, arrivalMinutesAgo: 6 },
        { severity: 2, arrivalMinutesAgo: 10 },
        { severity: 3, arrivalMinutesAgo: 12 },
        { severity: 3, arrivalMinutesAgo: 15 },
        { severity: 4, arrivalMinutesAgo: 20 },
        { severity: 5, arrivalMinutesAgo: 25 },
      ];
      return {
        patients: generateSeededPatients(2002, specs, now),
        doctors: withDoctorsAvailable(doctors, new Set(["D1", "D4"])), // most doctors already busy
        departments: withRoomsOccupied(departments, { Emergency: 5, Trauma: 2, Cardiology: 3, "General Medicine": 2, Pediatrics: 1 }),
      };
    }

    case "fairness-test": {
      const patients = withDeterministicArrivalSequence(
        withDeterministicServiceTimes(
          [...buildFairnessScenario("same-severity", now), ...buildFairnessScenario("long-wait", now)],
          3003
        )
      );
      return {
        patients,
        doctors: withDoctorsAvailable(doctors, new Set(["D1", "D2", "D3", "D4", "D5", "D6"])),
        departments: withRoomsOccupied(departments, { Emergency: 1, Trauma: 0, Cardiology: 0, "General Medicine": 0, Pediatrics: 0 }),
      };
    }

    case "starvation-test": {
      const specs: SeededPatientSpec[] = [
        { severity: 4, arrivalMinutesAgo: 95 }, // the long-waiting patient
        { severity: 2, arrivalMinutesAgo: 20 },
        { severity: 3, arrivalMinutesAgo: 15 },
        { severity: 2, arrivalMinutesAgo: 10 },
        { severity: 3, arrivalMinutesAgo: 6 },
        { severity: 2, arrivalMinutesAgo: 2 },
      ];
      return {
        patients: generateSeededPatients(4004, specs, now),
        doctors: withDoctorsAvailable(doctors, new Set(["D1", "D2"])),
        departments: withRoomsOccupied(departments, { Emergency: 3, Trauma: 1, Cardiology: 1, "General Medicine": 1, Pediatrics: 0 }),
      };
    }

    case "algorithm-comparison": {
      // Literally the same generator and config Algorithm Duel uses, so the
      // live queue and the Duel page can demonstrate the identical dataset.
      const patients = generateDuelDataset(DEFAULT_DUEL_CONFIG, now);
      return {
        patients,
        doctors: withDoctorsAvailable(doctors, new Set(["D1", "D2", "D4"])),
        departments: withRoomsOccupied(departments, { Emergency: 2, Trauma: 1, Cardiology: 1, "General Medicine": 1, Pediatrics: 0 }),
      };
    }

    case "overcrowded": {
      const specs: SeededPatientSpec[] = Array.from({ length: 18 }, (_, i) => {
        const severities = [1, 2, 2, 3, 3, 3, 4, 4, 5] as const;
        return { severity: severities[i % severities.length], arrivalMinutesAgo: 2 + i * 4, isEmergency: i % 7 === 0 };
      });
      return {
        patients: generateSeededPatients(6006, specs, now),
        doctors: withDoctorsAvailable(doctors, new Set(["D4"])), // almost everyone busy
        departments: withRoomsOccupied(departments, { Emergency: 6, Trauma: 3, Cardiology: 4, "General Medicine": 5, Pediatrics: 3 }),
      };
    }
  }
}
