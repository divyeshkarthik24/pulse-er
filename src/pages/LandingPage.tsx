import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, FlaskConical, GitBranch, Presentation, ShieldCheck, Timer, Zap } from "lucide-react";
import { MiniHeapDemo } from "../components/landing/MiniHeapDemo";

const FEATURES = [
  {
    icon: GitBranch,
    title: "Binary heap scheduler",
    body: "Insertion and extraction run in O(log n) with real heapify-up / heapify-down operations — never a re-sorted array.",
  },
  {
    icon: ShieldCheck,
    title: "Starvation-safe fairness",
    body: "An aging mechanism lifts long-waiting patients within a mathematically bounded range that can never override a genuinely critical case.",
  },
  {
    icon: Timer,
    title: "Explainable every time",
    body: "Every scheduling decision ships with a transparent breakdown: severity, wait credit, aging bonus, and the final score.",
  },
  {
    icon: Zap,
    title: "Live ER simulation",
    body: "Generate continuous arrivals, watch doctors free up, and see the queue reorganize itself in real time.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <header className="flex items-center justify-between px-6 md:px-10 py-5 max-w-[1300px] mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-lg bg-[var(--color-emerald)] text-white flex items-center justify-center">
            <Activity size={17} />
          </span>
          <span className="font-display text-lg">Pulse ER</span>
        </div>
        <Link
          to="/app"
          className="text-sm font-medium px-4 py-2 rounded-xl border border-[var(--color-line)] hover:border-[var(--color-ink-mute)] transition-colors"
        >
          Enter Dashboard →
        </Link>
      </header>

      <section className="max-w-[1300px] mx-auto px-6 md:px-10 pt-10 md:pt-16 pb-20 grid md:grid-cols-2 gap-14 items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-emerald)] bg-[var(--color-emerald-soft)] px-3 py-1.5 rounded-full mb-6">
            DSA Capstone · Heap-Based Scheduling
          </div>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] mb-6">
            Emergency care,
            <br />
            prioritized <span className="italic text-[var(--color-emerald)]">intelligently</span>.
          </h1>
          <p className="text-[var(--color-ink-soft)] text-base md:text-lg max-w-lg mb-8 leading-relaxed">
            A working simulation of an ER triage queue built on a custom priority-queue engine —
            balancing medical urgency against fairness, with a built-in aging mechanism so no
            patient waits forever. Educational simulation only, not a real medical system.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 bg-[var(--color-emerald)] text-white px-5 py-3 rounded-xl font-semibold text-sm hover:brightness-110 transition shadow-[var(--shadow-soft)]"
            >
              <Activity size={16} /> Enter ER Dashboard
            </Link>
            <Link
              to="/app/lab"
              className="inline-flex items-center gap-2 border border-[var(--color-line)] px-5 py-3 rounded-xl font-semibold text-sm hover:border-[var(--color-ink-mute)] transition"
            >
              <FlaskConical size={16} /> Explore Algorithm
            </Link>
            <Link
              to="/app/presentation"
              className="inline-flex items-center gap-2 border border-[var(--color-line)] px-5 py-3 rounded-xl font-semibold text-sm hover:border-[var(--color-ink-mute)] transition"
            >
              <Presentation size={16} /> Run Simulation
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative flex justify-center md:justify-end"
        >
          <div className="absolute -inset-6 bg-[var(--color-emerald-soft)] rounded-[2rem] blur-2xl opacity-60 -z-10" />
          <div className="w-full max-w-sm rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lift)]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-mute)]">
                Live priority queue
              </span>
              <span className="h-2 w-2 rounded-full bg-[var(--color-emerald)] animate-pulse" />
            </div>
            <MiniHeapDemo />
          </div>
        </motion.div>
      </section>

      <section className="max-w-[1300px] mx-auto px-6 md:px-10 py-16 border-t border-[var(--color-line)]">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
            >
              <f.icon size={20} className="text-[var(--color-emerald)] mb-3" />
              <h3 className="font-semibold text-sm mb-1.5">{f.title}</h3>
              <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="max-w-[1300px] mx-auto px-6 md:px-10 py-10 text-xs text-[var(--color-ink-mute)] border-t border-[var(--color-line)]">
        Pulse ER is an educational DSA simulation. It does not provide real medical triage or decision support.
      </footer>
    </div>
  );
}
