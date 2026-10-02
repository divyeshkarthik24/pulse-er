import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { HeapOpStep, Patient } from "../../types";
import { SEVERITY_META } from "../../types";
import clsx from "clsx";

const VIEW_W = 640;
const LEVEL_H = 86;

function treeLayout(n: number) {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const depth = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (2 ** depth - 1);
    const levelCount = 2 ** depth;
    const spacing = VIEW_W / levelCount;
    const x = spacing / 2 + posInLevel * spacing;
    const y = 36 + depth * LEVEL_H;
    positions.push({ x, y });
  }
  return positions;
}

export function HeapVisualizer({ heapArray, ops }: { heapArray: Patient[]; ops: HeapOpStep[] }) {
  const [view, setView] = useState<"tree" | "array">("tree");
  const positions = useMemo(() => treeLayout(heapArray.length), [heapArray.length]);
  const highlighted = new Set(ops.flatMap((o) => o.indices));
  const swapIdx = new Set(ops.filter((o) => o.type === "swap").flatMap((o) => o.indices));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-[var(--color-paper-dim)] rounded-lg p-1">
          {(["tree", "array"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx(
                "text-xs font-medium px-3 py-1.5 rounded-md capitalize transition-colors",
                view === v ? "bg-[var(--color-surface-raised)] shadow-[var(--shadow-soft)] text-[var(--color-ink)]" : "text-[var(--color-ink-mute)]"
              )}
            >
              {v === "tree" ? "Heap Tree" : "Heap Array"}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--color-ink-mute)] font-mono">{heapArray.length} nodes</span>
      </div>

      {heapArray.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-[var(--color-ink-mute)]">
          Heap is empty.
        </div>
      ) : view === "array" ? (
        <div className="flex flex-wrap gap-2">
          {heapArray.map((p, i) => {
            const meta = SEVERITY_META[p.severity];
            return (
              <motion.div
                layout
                key={p.id}
                className={clsx(
                  "flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 text-center shrink-0",
                  swapIdx.has(i) ? "border-[var(--color-amber)]" : highlighted.has(i) ? "border-[var(--color-teal)]" : "border-[var(--color-line)]"
                )}
                style={{ background: `color-mix(in srgb, ${meta.color} 10%, var(--color-surface))` }}
              >
                <span className="text-[9px] text-[var(--color-ink-mute)] font-mono">[{i}]</span>
                <span className="text-[11px] font-semibold truncate max-w-[52px]">{p.id}</span>
                <span className="text-[10px] font-mono text-[var(--color-ink-soft)]">{Math.round(p.priorityScore)}</span>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <svg viewBox={`0 0 ${VIEW_W} ${36 + Math.ceil(Math.log2(heapArray.length + 1)) * LEVEL_H}`} className="w-full h-auto">
          {heapArray.map((_, i) => {
            if (i === 0) return null;
            const parent = Math.floor((i - 1) / 2);
            const a = positions[parent];
            const b = positions[i];
            return (
              <line key={`edge-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--color-line)" strokeWidth={1.5} />
            );
          })}
          {heapArray.map((p, i) => {
            const meta = SEVERITY_META[p.severity];
            const pos = positions[i];
            const isSwap = swapIdx.has(i);
            const isHighlighted = highlighted.has(i);
            return (
              <g key={p.id} transform={`translate(${pos.x}, ${pos.y})`}>
                <motion.circle
                  layout
                  r={26}
                  fill={`color-mix(in srgb, ${meta.color} 14%, var(--color-surface))`}
                  stroke={isSwap ? "var(--color-amber)" : isHighlighted ? "var(--color-teal)" : meta.color}
                  strokeWidth={isSwap || isHighlighted ? 3 : 1.5}
                  animate={isSwap ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.4 }}
                />
                <text textAnchor="middle" y={-2} fontSize={11} fontWeight={700} fill="var(--color-ink)">
                  {p.id}
                </text>
                <text textAnchor="middle" y={12} fontSize={9} fill="var(--color-ink-soft)" fontFamily="var(--font-mono)">
                  {Math.round(p.priorityScore)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
