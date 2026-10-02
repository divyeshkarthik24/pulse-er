import type { Doctor } from "../types";

export interface SimulationConfig {
  arrivalsPerHour: number; // average patient arrival rate
  speedMultiplier: 1 | 2 | 5 | 10;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  arrivalsPerHour: 18,
  speedMultiplier: 1,
};

/**
 * Stateless policy helpers for the ER simulation. The simulation's
 * clock, patient list, and queue all live in the Zustand store (single
 * source of truth for the UI); this class only answers two questions:
 * "should a new patient arrive right now?" and "which doctor should
 * pick up the next patient?" — kept separate from state so each policy
 * can be unit-reasoned about independently.
 */
export class SimulationEngine {
  private config: SimulationConfig;

  constructor(config: SimulationConfig = DEFAULT_SIMULATION_CONFIG) {
    this.config = config;
  }

  setConfig(config: Partial<SimulationConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): SimulationConfig {
    return this.config;
  }

  /** Probability-based arrival check for a simulated-time tick of `deltaMinutes`. */
  shouldSpawnArrival(deltaMinutes: number): boolean {
    const expected = (this.config.arrivalsPerHour / 60) * deltaMinutes;
    return Math.random() < expected;
  }

  pickAvailableDoctor(doctors: Doctor[], preferredDepartment?: string): Doctor | undefined {
    const inDept = doctors.filter((d) => d.available && d.department === preferredDepartment);
    if (inDept.length > 0) return inDept[0];
    return doctors.find((d) => d.available);
  }
}
