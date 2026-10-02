import type { Doctor, Patient, SeverityLevel } from "../types";

export interface TreatmentRecord {
  patientId: string;
  severity: SeverityLevel;
  waitMinutes: number;
  treatmentMinutes: number;
  completedAt: number;
}

export interface DashboardStats {
  totalWaiting: number;
  criticalWaiting: number;
  avgWaitMinutes: number;
  longestWaitingPatient?: { id: string; name: string; minutes: number };
  patientsTreatedToday: number;
  queueSize: number;
  doctorsAvailable: number;
  doctorsTotal: number;
  roomsOccupied: number;
  roomsTotal: number;
  bySeverity: Record<SeverityLevel, number>;
  avgTreatmentMinutes: number;
  throughputLastHour: number;
}

export class StatisticsEngine {
  computeDashboard(
    patients: Patient[],
    doctors: Doctor[],
    treatmentRecords: TreatmentRecord[],
    rooms: { total: number; occupied: number },
    now: number
  ): DashboardStats {
    const waiting = patients.filter((p) => p.status === "queued" || p.status === "triage" || p.status === "registered");
    const critical = waiting.filter((p) => p.severity === 1);

    const waitMinutesList = waiting.map((p) => (now - p.arrivalTime) / 60000);
    const avgWaitMinutes = waitMinutesList.length
      ? Math.round((waitMinutesList.reduce((a, b) => a + b, 0) / waitMinutesList.length) * 10) / 10
      : 0;

    let longest: Patient | undefined;
    for (const p of waiting) {
      if (!longest || p.arrivalTime < longest.arrivalTime) longest = p;
    }

    const bySeverity: Record<SeverityLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    waiting.forEach((p) => (bySeverity[p.severity] += 1));

    const treatedToday = treatmentRecords.length;
    const avgTreatmentMinutes = treatedToday
      ? Math.round((treatmentRecords.reduce((a, r) => a + r.treatmentMinutes, 0) / treatedToday) * 10) / 10
      : 0;

    const oneHourAgo = now - 3600000;
    const throughputLastHour = treatmentRecords.filter((r) => r.completedAt >= oneHourAgo).length;

    return {
      totalWaiting: waiting.length,
      criticalWaiting: critical.length,
      avgWaitMinutes,
      longestWaitingPatient: longest
        ? { id: longest.id, name: longest.name, minutes: Math.round((now - longest.arrivalTime) / 60000) }
        : undefined,
      patientsTreatedToday: treatedToday,
      queueSize: waiting.length,
      doctorsAvailable: doctors.filter((d) => d.available).length,
      doctorsTotal: doctors.length,
      roomsOccupied: rooms.occupied,
      roomsTotal: rooms.total,
      bySeverity,
      avgTreatmentMinutes,
      throughputLastHour,
    };
  }

  arrivalsOverTime(patients: Patient[], bucketMinutes = 15): { time: string; count: number }[] {
    if (patients.length === 0) return [];
    const sorted = [...patients].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const bucketMs = bucketMinutes * 60000;
    const buckets = new Map<number, number>();
    sorted.forEach((p) => {
      const bucket = Math.floor(p.arrivalTime / bucketMs) * bucketMs;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    });
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ts, count]) => ({
        time: new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        count,
      }));
  }

  waitTimeBySeverity(treatmentRecords: TreatmentRecord[]): { severity: SeverityLevel; avgWait: number }[] {
    const bySeverity = new Map<SeverityLevel, number[]>();
    treatmentRecords.forEach((r) => {
      const arr = bySeverity.get(r.severity) ?? [];
      arr.push(r.waitMinutes);
      bySeverity.set(r.severity, arr);
    });
    return ([1, 2, 3, 4, 5] as SeverityLevel[]).map((sev) => {
      const arr = bySeverity.get(sev) ?? [];
      return {
        severity: sev,
        avgWait: arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0,
      };
    });
  }

  queueLengthOverTime(samples: { time: number; size: number }[]): { time: string; size: number }[] {
    return samples.map((s) => ({
      time: new Date(s.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      size: s.size,
    }));
  }
}
