import { create } from "zustand";
import { PriorityCalculator } from "../dsa/PriorityCalculator";
import { PriorityQueue } from "../dsa/PriorityQueue";
import { generateRandomPatient } from "../data/randomPatient";
import type { AlgorithmStrategyResult, HeapOpStep, Patient, SchedulerWeights, SeverityLevel } from "../types";
import { DEFAULT_WEIGHTS } from "../types";
import { runStrategyComparison } from "../analytics/algorithmComparison";
import { buildComparisonBenchmark } from "../analytics/comparisonBenchmark";

const labCalculator = new PriorityCalculator(DEFAULT_WEIGHTS);
const labQueue = new PriorityQueue(labCalculator);

interface AlgoLabState {
  clock: number;
  patients: Patient[];
  heapArray: Patient[];
  sortedQueue: Patient[];
  lastOps: HeapOpStep[];
  lastAction?: string;
  weights: SchedulerWeights;
  comparison: AlgorithmStrategyResult[];

  seed: () => void;
  addRandomPatient: (severity?: SeverityLevel) => void;
  removeHighestPriority: () => void;
  changeSeverity: (id: string, severity: SeverityLevel) => void;
  advanceWaitingTime: (minutes: number) => void;
  triggerAgingSweep: () => void;
  updateWeights: (weights: SchedulerWeights) => void;
  runComparison: () => void;
  reset: () => void;
}

function sync(set: (p: Partial<AlgoLabState>) => void, get: () => AlgoLabState) {
  set({
    heapArray: labQueue.heapArray(),
    sortedQueue: labQueue.sortedByPriority(),
    lastOps: labQueue.lastOps(),
    patients: [...get().patients],
  });
}

function seedPatients(now: number): Patient[] {
  const severities: SeverityLevel[] = [1, 3, 3, 4, 2];
  const offsets = [2, 5, 11, 3, 1];
  return severities.map((sev, i) => generateRandomPatient({ severity: sev, arrivalTime: now - offsets[i] * 60000 }));
}

export const useAlgoLabStore = create<AlgoLabState>((set, get) => ({
  clock: Date.now(),
  patients: [],
  heapArray: [],
  sortedQueue: [],
  lastOps: [],
  weights: DEFAULT_WEIGHTS,
  comparison: [],

  seed: () => {
    const now = Date.now();
    const patients = seedPatients(now);
    labQueue.clear();
    patients.forEach((p) => {
      p.status = "queued";
      labQueue.insert(p, now);
    });
    set({ clock: now, patients, lastAction: "Sandbox seeded with 5 patients." });
    sync(set, get);
  },

  addRandomPatient: (severity) => {
    const now = get().clock;
    const patient = generateRandomPatient({ severity, arrivalTime: now });
    patient.status = "queued";
    labQueue.insert(patient, now);
    set({ patients: [...get().patients, patient], lastAction: `Inserted ${patient.id} (${patient.triageCategory}).` });
    sync(set, get);
  },

  removeHighestPriority: () => {
    const removed = labQueue.extractNext();
    if (!removed) return;
    set({
      patients: get().patients.filter((p) => p.id !== removed.id),
      lastAction: `Extracted highest priority patient: ${removed.id} (${removed.triageCategory}).`,
    });
    sync(set, get);
  },

  changeSeverity: (id, severity) => {
    const patient = get().patients.find((p) => p.id === id);
    if (!patient) return;
    const old = patient.triageCategory;
    patient.severity = severity;
    patient.severityHistory.push({ severity, at: get().clock, reason: "Lab override" });
    const meta = ["", "Critical", "Urgent", "Moderate", "Stable", "Non-Urgent"][severity];
    patient.triageCategory = meta;
    labQueue.rescoreOne(patient, get().clock);
    set({ lastAction: `${patient.id} severity changed from ${old} to ${patient.triageCategory}.` });
    sync(set, get);
  },

  advanceWaitingTime: (minutes) => {
    const shiftMs = minutes * 60000;
    get().patients.forEach((p) => {
      p.arrivalTime -= shiftMs;
    });
    const now = get().clock;
    const { positionChanges } = labQueue.refreshAll(now);
    set({
      lastAction: `Advanced waiting time by ${minutes} min (${positionChanges.length} position changes).`,
    });
    sync(set, get);
  },

  triggerAgingSweep: () => {
    const now = get().clock;
    labQueue.refreshAll(now);
    set({ lastAction: "Aging sweep triggered — all scores recomputed and heap rebalanced." });
    sync(set, get);
  },

  updateWeights: (weights) => {
    labCalculator.setWeights(weights);
    labQueue.refreshAll(get().clock, "rescore-manual");
    set({ weights, lastAction: "Scheduler weights updated in sandbox." });
    sync(set, get);
  },

  runComparison: () => {
    const results = runStrategyComparison(buildComparisonBenchmark(get().clock), get().weights, 2);
    set({
      comparison: results,
      lastAction: "Ran FIFO vs Priority vs Priority+Aging on the standardized 17-patient benchmark.",
    });
  },

  reset: () => {
    labQueue.clear();
    labCalculator.setWeights(DEFAULT_WEIGHTS);
    get().seed();
    set({ weights: DEFAULT_WEIGHTS, comparison: [], lastAction: "Sandbox reset." });
  },
}));
