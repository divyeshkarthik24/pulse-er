import { useEffect, useRef } from "react";
import { useERStore } from "../store/useERStore";

const TICK_MS = 1000;
const MAX_DELTA_MS = 4000; // guard against huge jumps (tab backgrounded)

export function useClockTick() {
  const tick = useERStore((s) => s.tick);
  const initialized = useERStore((s) => s.initialized);
  const lastRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!initialized) return;
    lastRef.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - lastRef.current, MAX_DELTA_MS);
      lastRef.current = now;
      tick(delta);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [initialized, tick]);
}
