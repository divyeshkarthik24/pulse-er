import { PriorityCalculator } from "../dsa/PriorityCalculator";
import { PriorityQueue } from "../dsa/PriorityQueue";
import { TriageEngine } from "../dsa/TriageEngine";
import { StatisticsEngine } from "../analytics/StatisticsEngine";
import { SimulationEngine } from "../simulation/SimulationEngine";
import { DEFAULT_WEIGHTS } from "../types";

// Singleton engine instances shared by the main ER store. Kept outside
// Zustand state because they are mutable class instances (the heap),
// not plain serializable data — the store mirrors their *results*
// into reactive state after every operation.
export const calculator = new PriorityCalculator(DEFAULT_WEIGHTS);
export const queue = new PriorityQueue(calculator);
export const triageEngine = new TriageEngine();
export const statsEngine = new StatisticsEngine();
export const simEngine = new SimulationEngine();

export function makeEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
