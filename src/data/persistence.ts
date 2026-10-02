/**
 * Data layer. Deliberately shaped like a repository that talks to a
 * real backend (async, namespaced, JSON-serializable) even though the
 * current implementation persists to localStorage. Swapping this for
 * a REST/IndexedDB/Firestore-backed implementation later would not
 * require touching the DSA engine, the simulation engine, or any UI
 * component — they only depend on this interface.
 */

const NS = "er-triage-sim:v1:";

async function microtask<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

export class LocalStore {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  async load<T>(fallback: T): Promise<T> {
    try {
      const raw = localStorage.getItem(NS + this.key);
      if (!raw) return microtask(fallback);
      return microtask(JSON.parse(raw) as T);
    } catch {
      return microtask(fallback);
    }
  }

  async save<T>(value: T): Promise<void> {
    try {
      localStorage.setItem(NS + this.key, JSON.stringify(value));
    } catch {
      // storage full / unavailable — fail silently, state still lives in memory
    }
    return microtask(undefined);
  }

  clear() {
    localStorage.removeItem(NS + this.key);
  }
}

export const patientsStore = new LocalStore("patients");
export const doctorsStore = new LocalStore("doctors");
export const departmentsStore = new LocalStore("departments");
export const eventLogStore = new LocalStore("eventLog");
export const settingsStore = new LocalStore("settings");
export const treatmentRecordsStore = new LocalStore("treatmentRecords");
export const statsHistoryStore = new LocalStore("statsHistory");
export const configHistoryStore = new LocalStore("configHistory");

export function clearAllPersistence() {
  [
    patientsStore,
    doctorsStore,
    departmentsStore,
    eventLogStore,
    settingsStore,
    treatmentRecordsStore,
    statsHistoryStore,
    configHistoryStore,
  ].forEach((s) => s.clear());
}
