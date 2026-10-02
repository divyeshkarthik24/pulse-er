import { NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  Cpu,
  FlaskConical,
  GitCompareArrows,
  LayoutDashboard,
  ListTree,
  Presentation,
  Rewind,
  Scale,
  Settings,
  Siren,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";
import { useERStore } from "../../store/useERStore";
import { useClockTick } from "../../hooks/useClockTick";
import { ToastHost } from "../common/ToastHost";
import clsx from "clsx";

const PRIMARY_NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/queue", label: "Live Queue", icon: ListTree },
  { to: "/app/lab", label: "Algorithm Lab", icon: FlaskConical },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/benchmark", label: "Benchmark Lab", icon: Cpu },
];

const DSA_NAV = [
  { to: "/app/dsa/stepper", label: "Heap Stepper", icon: Sparkles },
  { to: "/app/dsa/fairness", label: "Fairness Challenge", icon: Scale },
  { to: "/app/dsa/replay", label: "Queue Replay", icon: Rewind },
  { to: "/app/dsa/duel", label: "Algorithm Duel", icon: GitCompareArrows },
];

const FOOTER_NAV = [
  { to: "/app/about", label: "About the Algorithm", icon: BookOpen },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/queue", label: "Queue", icon: ListTree },
  { to: "/app/lab", label: "Lab", icon: FlaskConical },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return clsx(
    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
    isActive
      ? "bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"
      : "text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-dim)]"
  );
}

export function AppShell() {
  const init = useERStore((s) => s.init);
  const initialized = useERStore((s) => s.initialized);
  const clock = useERStore((s) => s.clock);
  const simRunning = useERStore((s) => s.simulation.running);
  const criticalCount = useERStore((s) => s.sortedQueue.filter((p) => p.severity === 1).length);

  useEffect(() => {
    if (!initialized) void init();
  }, [initialized, init]);

  useClockTick();

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)]">
        <div className="flex items-center gap-3 text-[var(--color-ink-soft)]">
          <Activity className="animate-pulse" size={20} />
          <span className="font-display text-lg">Opening the ER…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex">
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-6 sticky top-0 h-screen overflow-y-auto">
        <NavLink to="/" className="flex items-center gap-2.5 px-2 mb-8">
          <span className="h-8 w-8 rounded-lg bg-[var(--color-emerald)] text-white flex items-center justify-center">
            <Activity size={17} />
          </span>
          <span className="font-display text-lg tracking-tight">Pulse ER</span>
        </NavLink>

        <nav className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-5 mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-mute)]">
          DSA
        </div>
        <nav className="flex flex-col gap-1">
          {DSA_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-5 pt-5 border-t border-[var(--color-line)] flex flex-col gap-1">
          {FOOTER_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <NavLink
            to="/app/presentation"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-[var(--color-ink)] text-[var(--color-paper)] px-3 py-2.5 text-sm font-semibold hover:brightness-125 transition"
          >
            <Presentation size={16} />
            Presentation Mode
          </NavLink>
          {criticalCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-coral)] font-medium px-1">
              <Siren size={13} className="pulse-critical rounded-full" />
              {criticalCount} critical patient{criticalCount > 1 ? "s" : ""} waiting
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-[var(--color-line)] bg-[var(--color-surface)]/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
            <span
              className={clsx(
                "h-2 w-2 rounded-full",
                simRunning ? "bg-[var(--color-emerald)] animate-pulse" : "bg-[var(--color-ink-mute)]"
              )}
            />
            {simRunning ? "Simulation running" : "Live"}
          </div>
          <div className="font-mono text-sm text-[var(--color-ink-soft)] tabular-nums">
            {new Date(clock).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </header>
        <main className="flex-1 px-5 md:px-8 py-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <ToastHost />
    </div>
  );
}

function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur border-t border-[var(--color-line)] flex justify-around py-2">
      {MOBILE_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            clsx(
              "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium",
              isActive ? "text-[var(--color-emerald)]" : "text-[var(--color-ink-mute)]"
            )
          }
        >
          <item.icon size={18} />
          {item.label.split(" ")[0]}
        </NavLink>
      ))}
    </nav>
  );
}
