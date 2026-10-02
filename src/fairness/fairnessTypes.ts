export type FairnessScenarioKey =
  | "same-severity"
  | "long-wait"
  | "escalation"
  | "starvation"
  | "safety-boundary";

export interface FairnessScenario {
  key: FairnessScenarioKey;
  title: string;
  description: string;
}

export const FAIRNESS_SCENARIOS: FairnessScenario[] = [
  {
    key: "same-severity",
    title: "Scenario 1 — Same Severity",
    description: "Three Urgent patients, arrivals minutes apart. Demonstrates plain arrival-order fairness.",
  },
  {
    key: "long-wait",
    title: "Scenario 2 — Long Wait",
    description: "A patient with unlucky intake variance is initially out-ranked by a later, luckier peer. Watch aging correct it.",
  },
  {
    key: "escalation",
    title: "Scenario 3 — Emergency Escalation",
    description: "A Moderate patient's condition suddenly worsens to Critical. Severity overrides everything else immediately.",
  },
  {
    key: "starvation",
    title: "Scenario 4 — Starvation Protection",
    description: "A low-severity patient waits through repeated higher-severity arrivals — aging gives them a bounded boost, never unbounded.",
  },
  {
    key: "safety-boundary",
    title: "Scenario 5 — Safety Boundary",
    description: "The maximum possible non-severity boost, measured live against the gap between severity tiers.",
  },
];

export interface FairnessPatientRow {
  id: string;
  name: string;
  severityLabel: string;
  severityBase: number;
  waitMinutes: number;
  waitFactor: number;
  agingBonus: number;
  agingActive: boolean;
  emergencyModifier: number;
  registrationVariance: number;
  finalScore: number;
  position: number;
}
