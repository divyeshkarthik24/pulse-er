import { create } from "zustand";
import { PriorityCalculator } from "../dsa/PriorityCalculator";
import { PriorityQueue } from "../dsa/PriorityQueue";
import { TriageEngine } from "../dsa/TriageEngine";
import { buildFairnessScenario, freshArrival } from "../fairness/FairnessChallengeEngine";
import type { FairnessScenarioKey } from "../fairness/fairnessTypes";
import { DEFAULT_WEIGHTS, type Patient, type PriorityBreakdown, type SchedulerWeights, type SeverityLevel } from "../types";

const fairnessCalculator = new PriorityCalculator(DEFAULT_WEIGHTS);
const fairnessQueue = new PriorityQueue(fairnessCalculator);
const triageEngine = new TriageEngine();

interface FairnessState {
  scenario: FairnessScenarioKey;
  clock: number;
  patients: Patient[];
  beforeOrder: string[]; // ids, order captured right before the most recent change
  /** Each patient's breakdown exactly as computed when the scenario was first loaded — never mutated afterward. */
  initialBreakdowns: Record<string, PriorityBreakdown>;
  weights: SchedulerWeights;
  autoRunning: boolean;

  loadScenario: (key: FairnessScenarioKey) => void;
  advance: (minutes: number) => void;
  startAutoRun: () => void;
  stopAutoRun: () => void;
  escalatePatient: (id: string, severity: SeverityLevel) => void;
  addArrival: (severity: SeverityLevel) => void;
  setWeights: (weights: SchedulerWeights) => void;
  resetWeights: () => void;
  reset: () => void;
}

function syncPatients(set: (p: Partial<FairnessState>) => void) {
  set({ patients: fairnessQueue.sortedByPriority() });
}

export const useFairnessChallengeStore = create<FairnessState>((set, get) => ({
  scenario: "same-severity",
  clock: Date.now(),
  patients: [],
  beforeOrder: [],
  initialBreakdowns: {},
  weights: DEFAULT_WEIGHTS,
  autoRunning: false,

  loadScenario: (key) => {
    const now = Date.now();
    fairnessQueue.clear();
    const patients = buildFairnessScenario(key, now);
    patients.forEach((p) => fairnessQueue.insert(p, now));
    const sorted = fairnessQueue.sortedByPriority();
    const initialBreakdowns: Record<string, PriorityBreakdown> = {};
    sorted.forEach((p) => {
      initialBreakdowns[p.id] = { ...p.priorityBreakdown };
    });
    set({
      scenario: key,
      clock: now,
      beforeOrder: sorted.map((p) => p.id),
      initialBreakdowns,
      autoRunning: false,
    });
    syncPatients(set);
  },

  advance: (minutes) => {
    const beforeOrder = fairnessQueue.sortedByPriority().map((p) => p.id);
    const now = get().clock + minutes * 60000;
    fairnessQueue.refreshAll(now, "rescore-aging");
    set({ clock: now, beforeOrder });
    syncPatients(set);
  },

  startAutoRun: () => set({ autoRunning: true }),
  stopAutoRun: () => set({ autoRunning: false }),

  escalatePatient: (id, severity) => {
    const patient = get().patients.find((p) => p.id === id);
    if (!patient) return;
    const beforeOrder = fairnessQueue.sortedByPriority().map((p) => p.id);
    triageEngine.escalate(patient, severity, "Fairness Challenge: manual escalation", get().clock);
    fairnessQueue.rescoreOne(patient, get().clock, "rescore-escalation");
    set({ beforeOrder });
    syncPatients(set);
  },

  addArrival: (severity) => {
    const beforeOrder = fairnessQueue.sortedByPriority().map((p) => p.id);
    const now = get().clock;
    const patient = freshArrival(severity, now, `New arrival ${new Date(now).toLocaleTimeString()}`);
    fairnessQueue.insert(patient, now);
    set((s) => ({ beforeOrder, initialBreakdowns: { ...s.initialBreakdowns, [patient.id]: { ...patient.priorityBreakdown } } }));
    syncPatients(set);
  },

  setWeights: (weights) => {
    fairnessCalculator.setWeights(weights);
    fairnessQueue.refreshAll(get().clock, "rescore-manual");
    set({ weights });
    syncPatients(set);
  },

  resetWeights: () => {
    fairnessCalculator.setWeights(DEFAULT_WEIGHTS);
    fairnessQueue.refreshAll(get().clock, "rescore-manual");
    set({ weights: DEFAULT_WEIGHTS });
    syncPatients(set);
  },

  reset: () => get().loadScenario(get().scenario),
}));

export function fairnessCalculatorInstance() {
  return fairnessCalculator;
}
