import type { Patient, SeverityLevel } from "../types";
import { generateRandomPatient } from "../data/randomPatient";

/**
 * A controlled benchmark dataset for the FIFO vs Priority vs Priority+Aging
 * report. Rather than compare whatever handful of patients happen to be in
 * the live queue (which may be too small, or too sparse within any one
 * severity tier, to ever let two same-tier patients actually compete for a
 * server), this builds a deliberately larger, more varied spread —
 * multiple patients per severity tier with a mix of tight and wide arrival
 * gaps — so the comparison reliably demonstrates what aging changes rather
 * than occasionally tying by chance on a thin dataset. The live scheduler
 * itself never uses this; it's purely for the "evidence" report.
 */
export function buildComparisonBenchmark(now: number): Patient[] {
  const plan: { severity: SeverityLevel; minutesAgo: number }[] = [
    { severity: 1, minutesAgo: 4 },
    { severity: 1, minutesAgo: 55 },
    { severity: 2, minutesAgo: 8 },
    { severity: 2, minutesAgo: 38 },
    { severity: 2, minutesAgo: 70 },
    { severity: 3, minutesAgo: 3 },
    { severity: 3, minutesAgo: 18 },
    { severity: 3, minutesAgo: 45 },
    { severity: 3, minutesAgo: 80 },
    { severity: 4, minutesAgo: 6 },
    { severity: 4, minutesAgo: 25 },
    { severity: 4, minutesAgo: 50 },
    { severity: 4, minutesAgo: 95 },
    { severity: 4, minutesAgo: 130 },
    { severity: 5, minutesAgo: 10 },
    { severity: 5, minutesAgo: 60 },
    { severity: 5, minutesAgo: 115 },
  ];
  return plan.map(({ severity, minutesAgo }) =>
    generateRandomPatient({ severity, arrivalTime: now - minutesAgo * 60000 })
  );
}
