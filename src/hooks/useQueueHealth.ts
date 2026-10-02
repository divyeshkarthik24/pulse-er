import { useMemo } from "react";
import { useERStore } from "../store/useERStore";
import { computeQueueHealth } from "../health/QueueHealthEngine";
import type { QueueHealthMetrics } from "../health/queueHealthTypes";

export function useQueueHealth(): QueueHealthMetrics {
  const sortedQueue = useERStore((s) => s.sortedQueue);
  const doctors = useERStore((s) => s.doctors);
  const departments = useERStore((s) => s.departments);
  const queueSizeHistory = useERStore((s) => s.queueSizeHistory);

  return useMemo(() => {
    const criticalWaits = sortedQueue.filter((p) => p.severity === 1).map((p) => p.priorityBreakdown.waitMinutes);
    const waitTimesBySeverity = ([1, 2, 3, 4, 5] as const).map((sev) =>
      sortedQueue.filter((p) => p.severity === sev).map((p) => p.priorityBreakdown.waitMinutes)
    );
    const roomsTotal = departments.reduce((a, d) => a + d.roomsTotal, 0);
    const roomsAvailable = departments.reduce((a, d) => a + Math.max(0, d.roomsTotal - d.roomsOccupied), 0);
    const past = queueSizeHistory[Math.max(0, queueSizeHistory.length - 1 - 10)];

    return computeQueueHealth({
      queueSize: sortedQueue.length,
      criticalWaiting: criticalWaits.length,
      criticalWaitMinutesList: criticalWaits,
      avgWaitMinutes: sortedQueue.length
        ? sortedQueue.reduce((a, p) => a + p.priorityBreakdown.waitMinutes, 0) / sortedQueue.length
        : 0,
      maxWaitMinutes: sortedQueue.length ? Math.max(...sortedQueue.map((p) => p.priorityBreakdown.waitMinutes)) : 0,
      waitTimesBySeverity,
      doctorsAvailable: doctors.filter((d) => d.available).length,
      doctorsTotal: doctors.length,
      roomsAvailable,
      roomsTotal,
      queueSizeNowVsWindow: past ? { now: sortedQueue.length, past: past.size } : undefined,
      heapSize: sortedQueue.length,
      highestPriority: sortedQueue[0]?.priorityScore ?? 0,
      avgEffectivePriority: sortedQueue.length ? sortedQueue.reduce((a, p) => a + p.priorityScore, 0) / sortedQueue.length : 0,
    });
  }, [sortedQueue, doctors, departments, queueSizeHistory]);
}
