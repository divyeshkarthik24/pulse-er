import { create } from "zustand";
import { PriorityCalculator } from "../dsa/PriorityCalculator";
import { PriorityQueue } from "../dsa/PriorityQueue";
import { generateRandomPatient } from "../data/randomPatient";
import { HEAP_PHASE_LABEL, type HeapOpStep, type Patient, type SeverityLevel } from "../types";
import { DEFAULT_WEIGHTS } from "../types";

const stepperCalculator = new PriorityCalculator(DEFAULT_WEIGHTS);
const stepperQueue = new PriorityQueue(stepperCalculator);

interface HeapStepperState {
  clock: number;
  patients: Record<string, Patient>;
  preState: string[];
  steps: HeapOpStep[];
  opLabel: string;
  stepIndex: number; // 0 = preState, i = after steps[i-1]
  playing: boolean;
  speed: 0.5 | 1 | 1.5 | 2;

  seed: () => void;
  insertRandom: (severity?: SeverityLevel) => void;
  extractMax: () => void;
  peek: () => void;
  rescoreAging: (minutes: number) => void;
  escalate: (patientId: string, severity: SeverityLevel) => void;
  reset: () => void;

  setStepIndex: (i: number) => void;
  stepNext: () => void;
  stepPrev: () => void;
  skipToEnd: () => void;
  restart: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (s: 0.5 | 1 | 1.5 | 2) => void;
}

function runOp(set: (p: Partial<HeapStepperState>) => void, get: () => HeapStepperState, opLabel: string, ops: HeapOpStep[]) {
  const patientsRecord: Record<string, Patient> = { ...get().patients };
  stepperQueue.heapArray().forEach((p) => {
    patientsRecord[p.id] = p;
  });
  set({
    patients: patientsRecord,
    steps: ops,
    opLabel,
    stepIndex: 0,
    playing: false,
  });
}

export const useHeapStepperStore = create<HeapStepperState>((set, get) => ({
  clock: Date.now(),
  patients: {},
  preState: [],
  steps: [],
  opLabel: "",
  stepIndex: 0,
  playing: false,
  speed: 1,

  seed: () => {
    const now = Date.now();
    stepperQueue.clear();
    const severities: SeverityLevel[] = [3, 2, 4, 3, 1];
    const offsets = [8, 3, 15, 1, 0];
    const patientsRecord: Record<string, Patient> = {};
    severities.forEach((sev, i) => {
      const p = generateRandomPatient({ severity: sev, arrivalTime: now - offsets[i] * 60000 });
      stepperQueue.insert(p, now);
      patientsRecord[p.id] = p;
    });
    set({
      clock: now,
      patients: patientsRecord,
      preState: stepperQueue.heapArray().map((p) => p.id),
      steps: [],
      opLabel: "Seeded",
      stepIndex: 0,
      playing: false,
    });
  },

  insertRandom: (severity) => {
    const preState = stepperQueue.heapArray().map((p) => p.id);
    const now = get().clock;
    const patient = generateRandomPatient({ severity, arrivalTime: now });
    patient.status = "queued";
    const ops = stepperQueue.insert(patient, now);
    set({ preState });
    runOp(set, get, `${HEAP_PHASE_LABEL.insert}: ${patient.id}`, ops);
  },

  extractMax: () => {
    const preState = stepperQueue.heapArray().map((p) => p.id);
    if (stepperQueue.size === 0) return;
    stepperQueue.extractNext();
    const ops = stepperQueue.lastOps();
    set({ preState });
    runOp(set, get, HEAP_PHASE_LABEL["extract-max"], ops);
  },

  peek: () => {
    const preState = stepperQueue.heapArray().map((p) => p.id);
    const { ops } = stepperQueue.peekLogged();
    set({ preState });
    runOp(set, get, HEAP_PHASE_LABEL.peek, ops);
  },

  rescoreAging: (minutes) => {
    const preState = stepperQueue.heapArray().map((p) => p.id);
    const now = get().clock + minutes * 60000;
    stepperQueue.refreshAll(now, "rescore-aging");
    const ops = stepperQueue.lastOps();
    set({ preState, clock: now });
    runOp(set, get, `${HEAP_PHASE_LABEL["rescore-aging"]}: +${minutes}min`, ops);
  },

  escalate: (patientId, severity) => {
    const preState = stepperQueue.heapArray().map((p) => p.id);
    const patient = stepperQueue.heapArray().find((p) => p.id === patientId);
    if (!patient) return;
    patient.severity = severity;
    stepperQueue.rescoreOne(patient, get().clock, "rescore-escalation");
    const ops = stepperQueue.lastOps();
    set({ preState });
    runOp(set, get, `${HEAP_PHASE_LABEL["rescore-escalation"]}: ${patientId}`, ops);
  },

  reset: () => {
    get().seed();
  },

  setStepIndex: (i) => set({ stepIndex: Math.max(0, Math.min(i, get().steps.length)) }),
  stepNext: () => set((s) => ({ stepIndex: Math.min(s.stepIndex + 1, s.steps.length) })),
  stepPrev: () => set((s) => ({ stepIndex: Math.max(s.stepIndex - 1, 0) })),
  skipToEnd: () => set((s) => ({ stepIndex: s.steps.length, playing: false })),
  restart: () => set({ stepIndex: 0, playing: false }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  setSpeed: (speed) => set({ speed }),
}));
