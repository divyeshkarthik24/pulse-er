import { create } from "zustand";
import type {
  Doctor,
  Department,
  EventLogEntry,
  EventType,
  HeapOpStep,
  Patient,
  ReplayChange,
  SchedulerConfigVersion,
  SchedulerWeights,
  SeverityLevel,
} from "../types";
import { DEFAULT_WEIGHTS } from "../types";
import { calculator, makeEventId, queue, simEngine, statsEngine, triageEngine } from "./engineInstances";
import type { PositionChange } from "../dsa/PriorityQueue";
import type { NewPatientInput } from "../dsa/TriageEngine";
import { generateRandomPatient } from "../data/randomPatient";
import { buildSeedPatients, SEED_DEPARTMENTS, SEED_DOCTORS } from "../data/seedData";
import { buildDemoScenario, DEMO_SCENARIOS, type DemoScenarioKey } from "../data/demoScenarios";
import { resetSequenceCounters } from "../dsa/TriageEngine";
import {
  clearAllPersistence,
  configHistoryStore,
  departmentsStore,
  doctorsStore,
  eventLogStore,
  patientsStore,
  settingsStore,
  treatmentRecordsStore,
} from "../data/persistence";
import type { TreatmentRecord } from "../analytics/StatisticsEngine";
import { computeQueueHealth } from "../health/QueueHealthEngine";

const MAX_EVENT_LOG = 400;
const MAX_TREATMENT_RECORDS = 500;
const ASSIGNMENT_TO_TREATMENT_MS = 3000; // real/clock ms a doctor takes to "walk over"
const DISCHARGE_DELAY_MS = 6000;

interface SimulationState {
  running: boolean;
  speed: 1 | 2 | 5 | 10;
  arrivalsPerHour: number;
}

/** Cumulative, real counts of actual heap operations this session — feeds the Dashboard's "DSA Activity" card. */
export interface DsaActivityCounters {
  insertions: number;
  extractions: number;
  comparisons: number;
  swaps: number;
  agingEvents: number;
  priorityUpdates: number;
}

const ZERO_DSA_COUNTERS: DsaActivityCounters = {
  insertions: 0,
  extractions: 0,
  comparisons: 0,
  swaps: 0,
  agingEvents: 0,
  priorityUpdates: 0,
};

interface ERState {
  initialized: boolean;
  clock: number;
  patients: Patient[];
  heapArray: Patient[];
  sortedQueue: Patient[];
  lastHeapOps: HeapOpStep[];
  lastPositionChanges: PositionChange[];
  doctors: Doctor[];
  departments: Department[];
  eventLog: EventLogEntry[];
  treatmentRecords: TreatmentRecord[];
  weights: SchedulerWeights;
  configHistory: SchedulerConfigVersion[];
  simulation: SimulationState;
  queueSizeHistory: { time: number; size: number }[];
  healthHistory: { time: number; score: number }[];
  dsaActivityCounters: DsaActivityCounters;
  currentScenario: DemoScenarioKey;
  presentationMode: boolean;
  selectedPatientId?: string;
  lastAnnouncement?: { patientId: string; message: string };

  init: () => Promise<void>;
  addPatient: (input: NewPatientInput) => Patient;
  quickAddRandomPatient: (severity?: SeverityLevel) => Patient;
  callNextPatient: () => Patient | undefined;
  escalatePatient: (patientId: string, newSeverity: SeverityLevel, reason: string) => void;
  updateWeights: (weights: SchedulerWeights) => void;
  tick: (realDeltaMs: number) => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  resetSimulation: () => void;
  setSimulationSpeed: (speed: 1 | 2 | 5 | 10) => void;
  setArrivalRate: (perHour: number) => void;
  togglePresentationMode: (value?: boolean) => void;
  selectPatient: (id?: string) => void;
  fastForward: (minutes: number) => void;
  resetAll: () => Promise<void>;
  loadDemoScenario: (key: DemoScenarioKey) => void;
  resetCurrentScenario: () => void;
}

function currentConfigVersion(get: () => ERState): number {
  const history = get().configHistory;
  return history.length ? history[history.length - 1].version : 1;
}

function initialConfigHistory(now: number, weights: SchedulerWeights): SchedulerConfigVersion[] {
  return [{ version: 1, weights, activatedAt: now }];
}

function logEvent(
  get: () => ERState,
  set: (partial: Partial<ERState>) => void,
  type: EventType,
  message: string,
  patient?: Patient,
  detail?: string,
  changes?: ReplayChange[]
) {
  const entry: EventLogEntry = {
    id: makeEventId(),
    type,
    timestamp: get().clock,
    configVersion: currentConfigVersion(get),
    patientId: patient?.id,
    patientLabel: patient ? `${patient.id} — ${patient.name}` : undefined,
    message,
    detail,
    changes,
  };
  const eventLog = [entry, ...get().eventLog].slice(0, MAX_EVENT_LOG);
  set({ eventLog });
}

function syncQueueDerived(set: (partial: Partial<ERState>) => void, get: () => ERState) {
  const ops = queue.lastOps();
  const counters = { ...get().dsaActivityCounters };
  if (ops.length > 0) {
    const phases = new Set(ops.map((o) => o.phase));
    if (phases.has("insert")) counters.insertions++;
    if (phases.has("extract-max")) counters.extractions++;
    if (phases.has("rescore-aging")) counters.agingEvents++;
    if (phases.has("rescore-escalation")) counters.priorityUpdates++;
    counters.comparisons += ops.filter((o) => o.type === "compare").length;
    counters.swaps += ops.filter((o) => o.type === "swap").length;
  }
  set({
    heapArray: queue.heapArray(),
    sortedQueue: queue.sortedByPriority(),
    lastHeapOps: ops,
    patients: [...get().patients],
    dsaActivityCounters: counters,
  });
}

const DEMO_SCENARIO_LABEL: Record<DemoScenarioKey, string> = Object.fromEntries(
  DEMO_SCENARIOS.map((s) => [s.key, s.label])
) as Record<DemoScenarioKey, string>;

/**
 * Shared "wipe and load" used by both the original reset and every demo
 * scenario — one action restores patients, queue, doctors, rooms, clock,
 * event log, DSA activity counters, health history, and config history
 * together, so a presenter never has to clear each one by hand.
 */
function applyScenario(
  set: (partial: Partial<ERState>) => void,
  scenarioKey: DemoScenarioKey,
  patients: Patient[],
  doctors: Doctor[],
  departments: Department[],
  now: number = Date.now()
) {
  queue.clear();
  calculator.setWeights(DEFAULT_WEIGHTS);
  const waiting = patients.filter((p) => p.status === "queued");
  waiting.forEach((p) => {
    p.priorityBreakdown = calculator.compute(p, now);
    p.priorityScore = p.priorityBreakdown.finalScore;
  });
  queue.loadAll(waiting);

  set({
    clock: now,
    patients,
    doctors: doctors.map((d) => ({ ...d })),
    departments: departments.map((d) => ({ ...d })),
    eventLog: [],
    treatmentRecords: [],
    weights: DEFAULT_WEIGHTS,
    heapArray: queue.heapArray(),
    sortedQueue: queue.sortedByPriority(),
    queueSizeHistory: [],
    healthHistory: [],
    dsaActivityCounters: { ...ZERO_DSA_COUNTERS },
    configHistory: initialConfigHistory(now, DEFAULT_WEIGHTS),
    currentScenario: scenarioKey,
    simulation: { running: false, speed: 1, arrivalsPerHour: 18 },
  });
}

let persistCounter = 0;
function persistState(get: () => ERState, force = false) {
  persistCounter++;
  if (!force && persistCounter % 5 !== 0) return;
  const s = get();
  void patientsStore.save(s.patients);
  void doctorsStore.save(s.doctors);
  void departmentsStore.save(s.departments);
  void eventLogStore.save(s.eventLog);
  void settingsStore.save(s.weights);
  void treatmentRecordsStore.save(s.treatmentRecords);
  void configHistoryStore.save(s.configHistory);
}

export const useERStore = create<ERState>((set, get) => ({
  initialized: false,
  clock: Date.now(),
  patients: [],
  heapArray: [],
  sortedQueue: [],
  lastHeapOps: [],
  lastPositionChanges: [],
  doctors: [],
  departments: [],
  eventLog: [],
  treatmentRecords: [],
  weights: DEFAULT_WEIGHTS,
  simulation: { running: false, speed: 1, arrivalsPerHour: 18 },
  queueSizeHistory: [],
  healthHistory: [],
  dsaActivityCounters: { ...ZERO_DSA_COUNTERS },
  configHistory: [],
  currentScenario: "normal",
  presentationMode: false,

  init: async () => {
    const now = Date.now();
    const [patients, doctors, departments, eventLog, weights, treatmentRecords, persistedConfigHistory] = await Promise.all([
      patientsStore.load<Patient[]>([]),
      doctorsStore.load<Doctor[]>([]),
      departmentsStore.load<Department[]>([]),
      eventLogStore.load<EventLogEntry[]>([]),
      settingsStore.load<SchedulerWeights>(DEFAULT_WEIGHTS),
      treatmentRecordsStore.load<TreatmentRecord[]>([]),
      configHistoryStore.load<SchedulerConfigVersion[]>([]),
    ]);

    const hasData = patients && patients.length > 0;
    const finalPatients = hasData ? patients : buildSeedPatients(now);
    const finalDoctors = doctors && doctors.length > 0 ? doctors : SEED_DOCTORS;
    const finalDepartments = departments && departments.length > 0 ? departments : SEED_DEPARTMENTS;

    // Re-sync the id/sequence counters with whatever was loaded (persisted
    // state, or a module reset from HMR) so new patients never collide
    // with existing ids.
    const maxIdNum = finalPatients.reduce((max, p) => {
      const n = Number(p.id.replace(/^P/, ""));
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 100);
    const maxSeq = finalPatients.reduce((max, p) => Math.max(max, p.arrivalSequence ?? 0), 0);
    resetSequenceCounters(maxSeq, maxIdNum);

    calculator.setWeights(weights ?? DEFAULT_WEIGHTS);
    const waiting = finalPatients.filter((p) => p.status === "queued");
    waiting.forEach((p) => {
      p.priorityBreakdown = calculator.compute(p, now);
      p.priorityScore = p.priorityBreakdown.finalScore;
    });
    queue.loadAll(waiting);

    set({
      initialized: true,
      clock: now,
      patients: finalPatients,
      doctors: finalDoctors,
      departments: finalDepartments,
      eventLog: hasData ? eventLog : [],
      treatmentRecords: hasData ? treatmentRecords : [],
      weights: weights ?? DEFAULT_WEIGHTS,
      configHistory:
        hasData && persistedConfigHistory && persistedConfigHistory.length > 0
          ? persistedConfigHistory
          : initialConfigHistory(now, weights ?? DEFAULT_WEIGHTS),
      heapArray: queue.heapArray(),
      sortedQueue: queue.sortedByPriority(),
    });

    if (!hasData) {
      logEvent(get, set, "simulation", "Demo dataset loaded — ER opened with 8 seeded patients.");
    }
  },

  addPatient: (input) => {
    const now = get().clock;
    const patient = triageEngine.createPatient({ ...input, arrivalTime: now });
    logEvent(get, set, "arrival", `${patient.name} (${patient.id}) arrived at the ER.`, patient);
    logEvent(get, set, "triage-complete", `Triage assessed severity as ${patient.triageCategory}.`, patient);

    patient.status = "queued";
    patient.queuedAt = now;
    const ops = queue.insert(patient, now);
    logEvent(
      get,
      set,
      "priority-calculated",
      `Priority score computed: ${patient.priorityScore}.`,
      patient,
      calculator.explain(patient)
    );
    logEvent(get, set, "heap-insert", `Inserted into priority heap (${ops.length} heap operations).`, patient);

    set({ patients: [...get().patients, patient] });
    syncQueueDerived(set, get);
    persistState(get, true);
    return patient;
  },

  quickAddRandomPatient: (severity) => {
    const now = get().clock;
    const patient = generateRandomPatient({ severity, arrivalTime: now });
    logEvent(get, set, "arrival", `${patient.name} (${patient.id}) arrived at the ER.`, patient);
    logEvent(get, set, "triage-complete", `Triage assessed severity as ${patient.triageCategory}.`, patient);
    patient.status = "queued";
    patient.queuedAt = now;
    const ops = queue.insert(patient, now);
    logEvent(
      get,
      set,
      "priority-calculated",
      `Priority score computed: ${patient.priorityScore}.`,
      patient,
      calculator.explain(patient)
    );
    logEvent(get, set, "heap-insert", `Inserted into priority heap (${ops.length} heap operations).`, patient);
    set({ patients: [...get().patients, patient] });
    syncQueueDerived(set, get);
    persistState(get, true);
    return patient;
  },

  callNextPatient: () => {
    const state = get();
    const doctor = simEngine.pickAvailableDoctor(state.doctors);
    if (!doctor) return undefined;
    const patient = queue.extractNext();
    if (!patient) return undefined;

    const now = state.clock;
    patient.status = "assigned";
    patient.assignedAt = now;
    patient.assignedDoctorId = doctor.id;

    const doctors = state.doctors.map((d) =>
      d.id === doctor.id ? { ...d, available: false, currentPatientId: patient.id } : d
    );
    const departments = state.departments.map((d) =>
      d.id === patient.department ? { ...d, roomsOccupied: Math.min(d.roomsTotal, d.roomsOccupied + 1) } : d
    );

    set({ doctors, departments, lastAnnouncement: { patientId: patient.id, message: calculator.explain(patient) } });
    logEvent(
      get,
      set,
      "doctor-assigned",
      `${doctor.name} will see ${patient.name}. Selected because they hold the highest effective priority in the queue.`,
      patient,
      calculator.explain(patient)
    );
    syncQueueDerived(set, get);
    persistState(get, true);
    return patient;
  },

  escalatePatient: (patientId, newSeverity, reason) => {
    const state = get();
    const patient = state.patients.find((p) => p.id === patientId);
    if (!patient) return;
    const oldLabel = patient.triageCategory;
    const oldScore = patient.priorityScore;
    const oldPosition = state.sortedQueue.findIndex((p) => p.id === patientId);

    triageEngine.escalate(patient, newSeverity, reason, state.clock);

    if (patient.status === "queued") {
      queue.rescoreOne(patient, state.clock);
    }

    const newPosition = queue.sortedByPriority().findIndex((p) => p.id === patientId);
    const changes: ReplayChange[] = [
      { label: "Severity", before: oldLabel, after: patient.triageCategory },
      { label: "Priority", before: `${Math.round(oldScore)}`, after: `${Math.round(patient.priorityScore)}` },
    ];
    if (oldPosition !== -1 && newPosition !== -1) {
      changes.push({ label: "Queue position", before: `#${oldPosition + 1}`, after: `#${newPosition + 1}` });
    }

    logEvent(
      get,
      set,
      "escalation",
      `${patient.name} (${patient.id}) changed from ${oldLabel} to ${patient.triageCategory}.`,
      patient,
      reason,
      changes
    );
    logEvent(
      get,
      set,
      "priority-updated",
      `Priority recalculated: ${patient.priorityScore}.`,
      patient,
      calculator.explain(patient)
    );
    syncQueueDerived(set, get);
    persistState(get, true);
  },

  updateWeights: (weights) => {
    const now = get().clock;
    const nextVersion = currentConfigVersion(get) + 1;
    const newConfigEntry: SchedulerConfigVersion = { version: nextVersion, weights, activatedAt: now };

    calculator.setWeights(weights);
    const { positionChanges } = queue.refreshAll(now, "rescore-manual");
    set((s) => ({ weights, configHistory: [...s.configHistory, newConfigEntry], lastPositionChanges: positionChanges }));
    syncQueueDerived(set, get);
    logEvent(
      get,
      set,
      "config-changed",
      `Scheduler settings changed — configuration v${nextVersion} activated.`,
      undefined,
      "All waiting patients were re-scored under the new weights. Past events remain linked to the configuration that was active when they happened."
    );
    logEvent(get, set, "priority-updated", "All waiting patients re-scored under the new configuration.");
    persistState(get, true);
  },

  tick: (realDeltaMs) => {
    const state = get();
    if (!state.initialized) return;
    const speed = state.simulation.running ? state.simulation.speed : 1;
    const deltaMs = realDeltaMs * speed;
    const now = state.clock + deltaMs;
    const deltaMinutes = deltaMs / 60000;

    const { positionChanges } = queue.refreshAll(now);
    let patients = [...state.patients];
    let doctors = state.doctors;
    let departments = state.departments;
    let treatmentRecords = state.treatmentRecords;
    let eventsToAdd: EventLogEntry[] = [];

    const tickConfigVersion = currentConfigVersion(get);
    const pushEvent = (type: EventType, message: string, patient?: Patient, detail?: string, changes?: ReplayChange[]) => {
      eventsToAdd.unshift({
        id: makeEventId(),
        type,
        timestamp: now,
        configVersion: tickConfigVersion,
        patientId: patient?.id,
        patientLabel: patient ? `${patient.id} — ${patient.name}` : undefined,
        message,
        detail,
        changes,
      });
    };

    if (positionChanges.length > 0) {
      positionChanges
        .filter((c) => c.to < c.from)
        .slice(0, 3)
        .forEach((c) => {
          const p = patients.find((pt) => pt.id === c.patientId);
          if (p) {
            pushEvent(
              "position-change",
              `${p.name} (${p.id}) moved to position #${c.to + 1} — ${c.reason}.`,
              p,
              undefined,
              [
                { label: "Queue position", before: `#${c.from + 1}`, after: `#${c.to + 1}` },
                { label: "Priority", before: "—", after: `${Math.round(p.priorityScore)}` },
                { label: "Reason", before: "—", after: c.reason },
              ]
            );
          }
        });
    }

    // Assigned -> in-treatment after the "doctor walks over" delay
    patients = patients.map((p) => {
      if (p.status === "assigned" && p.assignedAt && now - p.assignedAt >= ASSIGNMENT_TO_TREATMENT_MS) {
        pushEvent("treatment-start", `Treatment started for ${p.name} (${p.id}).`, p);
        return { ...p, status: "in-treatment" as const, treatmentStartedAt: now };
      }
      return p;
    });

    // In-treatment -> completed
    patients = patients.map((p) => {
      if (
        p.status === "in-treatment" &&
        p.treatmentStartedAt &&
        now - p.treatmentStartedAt >= p.estimatedTreatmentMinutes * 60000
      ) {
        const waitMinutes = p.queuedAt ? (p.assignedAt! - p.queuedAt) / 60000 : 0;
        treatmentRecords = [
          ...treatmentRecords,
          {
            patientId: p.id,
            severity: p.severity,
            waitMinutes: Math.round(waitMinutes * 10) / 10,
            treatmentMinutes: p.estimatedTreatmentMinutes,
            completedAt: now,
          },
        ].slice(-MAX_TREATMENT_RECORDS);
        doctors = doctors.map((d) =>
          d.id === p.assignedDoctorId
            ? { ...d, available: true, currentPatientId: undefined, patientsSeenToday: d.patientsSeenToday + 1 }
            : d
        );
        departments = departments.map((d) =>
          d.id === p.department ? { ...d, roomsOccupied: Math.max(0, d.roomsOccupied - 1) } : d
        );
        pushEvent("treatment-complete", `${p.name} (${p.id}) treatment completed.`, p);
        return { ...p, status: "completed" as const, completedAt: now };
      }
      return p;
    });

    // Completed -> discharged (housekeeping, keeps active views clean)
    patients = patients.map((p) => {
      if (p.status === "completed" && p.completedAt && now - p.completedAt >= DISCHARGE_DELAY_MS) {
        pushEvent("discharge", `${p.name} (${p.id}) discharged.`, p);
        return { ...p, status: "discharged" as const };
      }
      return p;
    });

    // Simulation-only: spawn arrivals + auto-assign free doctors
    if (state.simulation.running) {
      if (simEngine.shouldSpawnArrival(deltaMinutes)) {
        const newPatient = generateRandomPatient({ arrivalTime: now });
        newPatient.status = "queued";
        newPatient.queuedAt = now;
        pushEvent("arrival", `${newPatient.name} (${newPatient.id}) arrived at the ER.`, newPatient);
        pushEvent("triage-complete", `Triage assessed severity as ${newPatient.triageCategory}.`, newPatient);
        queue.insert(newPatient, now);
        pushEvent("heap-insert", `Inserted into priority heap. Score ${newPatient.priorityScore}.`, newPatient);
        patients = [...patients, newPatient];
      }

      const freeDoctors = doctors.filter((d) => d.available);
      for (const doc of freeDoctors) {
        if (queue.size === 0) break;
        const next = queue.extractNext();
        if (!next) break;
        next.status = "assigned";
        next.assignedAt = now;
        next.assignedDoctorId = doc.id;
        doctors = doctors.map((d) =>
          d.id === doc.id ? { ...d, available: false, currentPatientId: next.id } : d
        );
        departments = departments.map((d) =>
          d.id === next.department ? { ...d, roomsOccupied: Math.min(d.roomsTotal, d.roomsOccupied + 1) } : d
        );
        pushEvent("doctor-assigned", `${doc.name} will see ${next.name} (${next.id}).`, next, calculator.explain(next));
      }
    }

    const minuteTicked = Math.floor(now / 60000) !== Math.floor(state.clock / 60000);
    const queueSizeHistory = minuteTicked
      ? [...state.queueSizeHistory, { time: now, size: queue.size }].slice(-120)
      : state.queueSizeHistory;

    let healthHistory = state.healthHistory;
    if (minuteTicked) {
      const waiting = queue.sortedByPriority();
      const criticalWaits = waiting.filter((p) => p.severity === 1).map((p) => p.priorityBreakdown.waitMinutes);
      const waitTimesBySeverity = ([1, 2, 3, 4, 5] as const).map((sev) =>
        waiting.filter((p) => p.severity === sev).map((p) => p.priorityBreakdown.waitMinutes)
      );
      const roomsTotal = departments.reduce((a, d) => a + d.roomsTotal, 0);
      const roomsAvailable = departments.reduce((a, d) => a + Math.max(0, d.roomsTotal - d.roomsOccupied), 0);
      const past = queueSizeHistory[Math.max(0, queueSizeHistory.length - 1 - 10)];
      const health = computeQueueHealth({
        queueSize: queue.size,
        criticalWaiting: criticalWaits.length,
        criticalWaitMinutesList: criticalWaits,
        avgWaitMinutes: waiting.length ? waiting.reduce((a, p) => a + p.priorityBreakdown.waitMinutes, 0) / waiting.length : 0,
        maxWaitMinutes: waiting.length ? Math.max(...waiting.map((p) => p.priorityBreakdown.waitMinutes)) : 0,
        waitTimesBySeverity,
        doctorsAvailable: doctors.filter((d) => d.available).length,
        doctorsTotal: doctors.length,
        roomsAvailable,
        roomsTotal,
        queueSizeNowVsWindow: past ? { now: queue.size, past: past.size } : undefined,
        heapSize: queue.size,
        highestPriority: queue.peekNext()?.priorityScore ?? 0,
        avgEffectivePriority: waiting.length ? waiting.reduce((a, p) => a + p.priorityScore, 0) / waiting.length : 0,
      });
      healthHistory = [...state.healthHistory, { time: now, score: health.score }].slice(-120);
    }

    set({
      clock: now,
      patients,
      doctors,
      departments,
      treatmentRecords,
      queueSizeHistory,
      healthHistory,
      lastPositionChanges: positionChanges,
      eventLog: eventsToAdd.length ? [...eventsToAdd, ...state.eventLog].slice(0, MAX_EVENT_LOG) : state.eventLog,
    });
    syncQueueDerived(set, get);
    persistState(get);
  },

  startSimulation: () => {
    set((s) => ({ simulation: { ...s.simulation, running: true } }));
    logEvent(get, set, "simulation", "Simulation started.");
  },
  pauseSimulation: () => {
    set((s) => ({ simulation: { ...s.simulation, running: false } }));
    logEvent(get, set, "simulation", "Simulation paused.");
  },
  resumeSimulation: () => {
    set((s) => ({ simulation: { ...s.simulation, running: true } }));
    logEvent(get, set, "simulation", "Simulation resumed.");
  },
  resetSimulation: () => {
    set((s) => ({ simulation: { ...s.simulation, running: false } }));
    void get().resetAll();
  },
  setSimulationSpeed: (speed) => {
    set((s) => ({ simulation: { ...s.simulation, speed } }));
    simEngine.setConfig({ speedMultiplier: speed });
  },
  setArrivalRate: (perHour) => {
    set((s) => ({ simulation: { ...s.simulation, arrivalsPerHour: perHour } }));
    simEngine.setConfig({ arrivalsPerHour: perHour });
  },

  togglePresentationMode: (value) => {
    set((s) => ({ presentationMode: value ?? !s.presentationMode }));
  },

  selectPatient: (id) => set({ selectedPatientId: id }),

  fastForward: (minutes) => {
    const now = get().clock + minutes * 60000;
    const { positionChanges } = queue.refreshAll(now);
    set({ clock: now, lastPositionChanges: positionChanges });
    syncQueueDerived(set, get);
    logEvent(get, set, "aging-applied", `Fast-forwarded ${minutes} minutes — waiting time and aging bonuses recalculated for the whole queue.`);
    persistState(get, true);
  },

  resetAll: async () => {
    clearAllPersistence();
    const now = Date.now();
    applyScenario(set, "normal", buildSeedPatients(now), SEED_DOCTORS, SEED_DEPARTMENTS, now);
    logEvent(get, set, "simulation", "ER state reset to the demo dataset.");
    persistState(get, true);
  },

  loadDemoScenario: (key) => {
    const now = Date.now();
    const { patients, doctors, departments } = buildDemoScenario(key, now);
    applyScenario(set, key, patients, doctors, departments, now);
    const meta = DEMO_SCENARIO_LABEL[key];
    logEvent(get, set, "simulation", `Demo scenario "${meta}" loaded — ${patients.length} patients, deterministic seed.`);
    persistState(get, true);
  },

  resetCurrentScenario: () => {
    const key = get().currentScenario;
    get().loadDemoScenario(key);
  },
}));

export const dashboardStats = () => {
  const s = useERStore.getState();
  const roomsTotal = s.departments.reduce((a, d) => a + d.roomsTotal, 0);
  const roomsOccupied = s.departments.reduce((a, d) => a + d.roomsOccupied, 0);
  return statsEngine.computeDashboard(s.patients, s.doctors, s.treatmentRecords, { total: roomsTotal, occupied: roomsOccupied }, s.clock);
};
