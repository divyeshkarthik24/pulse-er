import { create } from "zustand";
import { DEFAULT_DUEL_CONFIG, generateDuelDataset, runAlgorithmDuel, type DuelConfig } from "../analytics/AlgorithmDuelEngine";
import type { AlgorithmDuelResult, DuelFrame, DuelStrategyKey, Patient } from "../types";
import { DEFAULT_WEIGHTS } from "../types";

interface DuelState {
  config: DuelConfig;
  dataset: Patient[];
  result?: AlgorithmDuelResult;
  framesByStrategy: Record<DuelStrategyKey, DuelFrame[]>;
  step: number; // how many patients have been "served" per strategy, in sync
  playing: boolean;
  speed: 1 | 2 | 5 | 10;

  run: () => void;
  reset: () => void;
  setConfig: (patch: Partial<DuelConfig>) => void;
  setStep: (n: number) => void;
  play: () => void;
  pause: () => void;
  setSpeed: (s: 1 | 2 | 5 | 10) => void;
}

const EMPTY_FRAMES: Record<DuelStrategyKey, DuelFrame[]> = { fifo: [], priority: [], "priority-aging": [] };

export const useDuelStore = create<DuelState>((set, get) => ({
  config: DEFAULT_DUEL_CONFIG,
  dataset: [],
  framesByStrategy: EMPTY_FRAMES,
  step: 0,
  playing: false,
  speed: 2,

  run: () => {
    const now = Date.now();
    const config = get().config;
    const dataset = generateDuelDataset(config, now);
    const result = runAlgorithmDuel(config, DEFAULT_WEIGHTS, now);
    const framesByStrategy: Record<DuelStrategyKey, DuelFrame[]> = { fifo: [], priority: [], "priority-aging": [] };
    result.frames.forEach((f) => framesByStrategy[f.strategy].push(f));
    set({ dataset, result, framesByStrategy, step: 0, playing: false });
  },

  reset: () => set({ dataset: [], result: undefined, framesByStrategy: EMPTY_FRAMES, step: 0, playing: false }),

  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  setStep: (n) => set({ step: Math.max(0, n) }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  setSpeed: (speed) => set({ speed }),
}));
