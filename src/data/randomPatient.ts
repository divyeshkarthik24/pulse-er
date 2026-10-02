import { TriageEngine, type NewPatientInput } from "../dsa/TriageEngine";
import type { SeverityLevel, VitalSigns } from "../types";

const FIRST_NAMES = [
  "Aarav", "Diya", "Rohan", "Isha", "Kabir", "Meera", "Arjun", "Sanya",
  "Vihaan", "Ananya", "Ishaan", "Priya", "Rahul", "Neha", "Karan", "Tara",
  "Dev", "Simran", "Aditya", "Riya", "Omar", "Lina", "Marcus", "Grace",
  "Elena", "Noah", "Zara", "Liam", "Mia", "Yusuf",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Khan", "Gupta", "Nair", "Iyer", "Singh",
  "Reddy", "Das", "Fernandes", "Rao", "Mehta", "Joshi", "Kapoor", "Chen",
  "Rossi", "Johnson", "Alvarez", "Okafor",
];

const SYMPTOM_POOL: Record<SeverityLevel, string[]> = {
  1: ["Cardiac arrest", "Severe trauma", "Unresponsive", "Major hemorrhage", "Stroke symptoms", "Anaphylaxis"],
  2: ["Chest pain", "Difficulty breathing", "Severe abdominal pain", "Deep laceration", "Suspected fracture"],
  3: ["Persistent vomiting", "Moderate fever", "Migraine", "Moderate burns", "Asthma flare-up"],
  4: ["Sprained ankle", "Mild fever", "Minor laceration", "Back pain", "Dehydration"],
  5: ["Common cold", "Minor rash", "Prescription refill", "Mild headache", "Routine check"],
};

const DEPARTMENTS = ["Emergency", "Trauma", "Cardiology", "General Medicine", "Pediatrics"];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.round(rand(min, max));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

export function randomVitals(severity: SeverityLevel): VitalSigns {
  const severityFactor = (6 - severity) / 5; // 1 = critical -> most deranged
  return {
    heartRate: Math.round(randInt(60, 90) + severityFactor * rand(20, 60)),
    systolicBP: Math.round(randInt(110, 125) - severityFactor * rand(10, 45)),
    diastolicBP: Math.round(randInt(70, 82) - severityFactor * rand(5, 20)),
    spo2: Math.round(Math.min(99, randInt(96, 99) - severityFactor * rand(2, 18))),
    temperatureC: Math.round((36.6 + severityFactor * rand(-0.3, 2.2)) * 10) / 10,
    respRate: Math.round(randInt(14, 18) + severityFactor * rand(2, 14)),
  };
}

const SEVERITY_DISTRIBUTION: { severity: SeverityLevel; weight: number }[] = [
  { severity: 1, weight: 6 },
  { severity: 2, weight: 16 },
  { severity: 3, weight: 34 },
  { severity: 4, weight: 29 },
  { severity: 5, weight: 15 },
];

export function weightedRandomSeverity(): SeverityLevel {
  const total = SEVERITY_DISTRIBUTION.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of SEVERITY_DISTRIBUTION) {
    if (r < d.weight) return d.severity;
    r -= d.weight;
  }
  return 3;
}

export function randomDepartment() {
  return pick(DEPARTMENTS);
}

const triageEngine = new TriageEngine();

export function generateRandomPatient(opts?: {
  severity?: SeverityLevel;
  arrivalTime?: number;
}): ReturnType<TriageEngine["createPatient"]> {
  const severity = opts?.severity ?? weightedRandomSeverity();
  const vitals = randomVitals(severity);
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const symptomCount = severity <= 2 ? 2 : 1;
  const input: NewPatientInput = {
    name,
    age: randInt(4, 88),
    gender: pick(["Male", "Female", "Other"]),
    symptoms: pickN(SYMPTOM_POOL[severity], symptomCount),
    severity,
    vitals,
    isEmergency: severity === 1 || (severity === 2 && Math.random() < 0.35),
    arrivalTime: opts?.arrivalTime,
  };
  const patient = triageEngine.createPatient(input);
  patient.department = randomDepartment();
  return patient;
}

export { triageEngine, DEPARTMENTS };
