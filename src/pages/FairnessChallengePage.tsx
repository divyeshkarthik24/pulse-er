import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, PlayCircle, RotateCcw, Scale, Siren, Sparkles, Timer, UserPlus } from "lucide-react";
import { useFairnessChallengeStore } from "../store/useFairnessChallengeStore";
import { fairnessCalculatorInstance } from "../store/useFairnessChallengeStore";
import { FAIRNESS_SCENARIOS } from "../fairness/fairnessTypes";
import { Card, SectionHeading } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { SEVERITY_BASE, REGISTRATION_VARIANCE_MAX, type SeverityLevel } from "../types";

const ADVANCE_OPTIONS = [5, 10, 30, 60];

export function FairnessChallengePage() {
  const {
    scenario,
    patients,
    beforeOrder,
    initialBreakdowns,
    weights,
    autoRunning,
    loadScenario,
    advance,
    startAutoRun,
    stopAutoRun,
    escalatePatient,
    addArrival,
  } = useFairnessChallengeStore();

  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) loadScenario(scenario);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    if (!autoRunning) return;
    const id = setInterval(() => advance(5), 1200);
    return () => clearInterval(id);
  }, [autoRunning, advance]);

  const calc = fairnessCalculatorInstance();
  const maxBoost = calc.maxPossibleBoost();
  const tierGap = calc.tierGap();
  const safe = calc.isStarvationSafe();

  const afterOrder = patients.map((p) => p.id);
  const positionChanged = beforeOrder.length > 0 && JSON.stringify(beforeOrder) !== JSON.stringify(afterOrder);

  // Find whoever climbed the most since the scenario loaded, and explain it
  // using their real initial-vs-current breakdown — never a generic sentence.
  const whyMoved = useMemo(() => {
    if (!started || patients.length === 0) return undefined;
    const initialOrder = patients.map((p) => p.id).length ? Object.keys(initialBreakdowns) : [];
    if (initialOrder.length === 0) return undefined;
    let best: { patient: (typeof patients)[number]; from: number; to: number } | undefined;
    patients.forEach((p, toIdx) => {
      const fromIdx = initialOrder.indexOf(p.id);
      if (fromIdx === -1) return;
      const climbed = fromIdx - toIdx;
      if (climbed > 0 && (!best || climbed > best.from - best.to)) {
        best = { patient: p, from: fromIdx, to: toIdx };
      }
    });
    if (!best) return undefined;
    const initial = initialBreakdowns[best.patient.id];
    const current = best.patient.priorityBreakdown;
    return {
      patient: best.patient,
      from: best.from,
      to: best.to,
      agingDelta: Math.round((current.agingBonus - initial.agingBonus) * 10) / 10,
      waitDelta: Math.round((current.waitFactor - initial.waitFactor) * 10) / 10,
      initialScore: Math.round(initial.finalScore),
      currentScore: Math.round(current.finalScore),
    };
  }, [patients, initialBreakdowns, started]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2.5">
            <Scale className="text-[var(--color-emerald)]" /> Fairness Challenge
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            Deterministic scenarios run through the production <code>PriorityCalculator</code> — nothing here is a separate, staged fairness demo.
          </p>
        </div>
        <Link to="/app/dsa/stepper" className="text-sm text-[var(--color-emerald)] font-medium hover:underline">
          View Heap Operation →
        </Link>
      </div>

      <Card>
        <SectionHeading eyebrow="Choose a scenario" title="Challenge modes" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {FAIRNESS_SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setStarted(true);
                loadScenario(s.key);
              }}
              className={`text-left rounded-xl border p-3 transition ${
                started && scenario === s.key
                  ? "border-[var(--color-emerald)] bg-[var(--color-emerald-soft)]"
                  : "border-[var(--color-line)] hover:border-[var(--color-ink-mute)]"
              }`}
            >
              <div className="text-xs font-semibold mb-1">{s.title}</div>
              <div className="text-[11px] text-[var(--color-ink-mute)] leading-snug">{s.description}</div>
            </button>
          ))}
        </div>
        {!started && (
          <Button variant="primary" size="sm" className="mt-4" onClick={() => setStarted(true)}>
            <PlayCircle size={14} /> Start Challenge
          </Button>
        )}
      </Card>

      {started && (
        <>
          <Card>
            <SectionHeading eyebrow="Controls" title="Advance time" />
            <div className="flex flex-wrap items-center gap-2">
              {ADVANCE_OPTIONS.map((m) => (
                <Button key={m} variant="outline" size="sm" onClick={() => advance(m)}>
                  <Timer size={13} /> +{m} min
                </Button>
              ))}
              {autoRunning ? (
                <Button variant="secondary" size="sm" onClick={stopAutoRun}>
                  Stop Auto Run
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={startAutoRun}>
                  <PlayCircle size={14} /> Auto Run
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => loadScenario(scenario)}>
                <RotateCcw size={14} /> Reset
              </Button>

              {scenario === "escalation" && (
                <Button variant="danger" size="sm" onClick={() => escalatePatient(patients.find((p) => p.name.includes("will escalate"))?.id ?? "", 1 as SeverityLevel)}>
                  <Siren size={14} /> Escalate Patient B to Critical
                </Button>
              )}
              {scenario === "starvation" && (
                <Button variant="danger" size="sm" onClick={() => addArrival(2 as SeverityLevel)}>
                  <UserPlus size={14} /> New Urgent patient cuts in line
                </Button>
              )}
            </div>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card>
                <SectionHeading
                  eyebrow={positionChanged ? "Order changed" : "Order unchanged"}
                  title="Before → After"
                  description="Only shows a change if the production algorithm actually caused one."
                />
                <div className="grid grid-cols-2 gap-4">
                  <OrderColumn title="Before" ids={beforeOrder} patients={patients} />
                  <OrderColumn title="After" ids={afterOrder} patients={patients} />
                </div>
                {positionChanged && !whyMoved && (
                  <div className="mt-4 text-sm bg-[var(--color-amber-soft)] text-[var(--color-amber)] rounded-xl p-3">
                    Why did the order change? A patient's effective priority crossed a peer's — either aging
                    credit accumulated past their intake-variance disadvantage, or severity/arrival changed outright.
                  </div>
                )}
                {whyMoved && (
                  <div className="mt-4 rounded-xl bg-[var(--color-amber-soft)] p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-amber)] mb-2">
                      <Sparkles size={13} /> Why did {whyMoved.patient.name} move?
                    </div>
                    <p className="text-sm text-[var(--color-ink)] leading-relaxed">
                      {whyMoved.patient.name} started at position #{whyMoved.from + 1} with an effective priority of{" "}
                      <strong>{whyMoved.initialScore}</strong>. Since then, waiting credit changed by{" "}
                      <strong>{whyMoved.waitDelta >= 0 ? "+" : ""}{whyMoved.waitDelta}</strong> and the aging bonus changed
                      by <strong>{whyMoved.agingDelta >= 0 ? "+" : ""}{whyMoved.agingDelta}</strong>, bringing the
                      effective priority to <strong>{whyMoved.currentScore}</strong>. That crossed at least one peer's
                      score, and the heap comparison moved them to position #{whyMoved.to + 1}.
                    </p>
                  </div>
                )}
              </Card>

              <Card>
                <SectionHeading eyebrow="Breakdown" title="Priority formula, per patient" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-[var(--color-ink-mute)] border-b border-[var(--color-line)]">
                        <th className="py-2 pr-3">Patient</th>
                        <th className="py-2 pr-3">Base</th>
                        <th className="py-2 pr-3">Wait credit</th>
                        <th className="py-2 pr-3">Aging</th>
                        <th className="py-2 pr-3">Emergency</th>
                        <th className="py-2 pr-3">Variance</th>
                        <th className="py-2 pr-3">Initial</th>
                        <th className="py-2 pr-3">Current</th>
                        <th className="py-2 pr-3">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map((p, i) => {
                        const b = p.priorityBreakdown;
                        const initial = initialBreakdowns[p.id];
                        return (
                          <tr key={p.id} className="border-b border-[var(--color-line-soft)]">
                            <td className="py-2 pr-3 font-medium">{p.name}</td>
                            <td className="py-2 pr-3 font-mono">{b.severityBase}</td>
                            <td className="py-2 pr-3 font-mono">+{b.waitFactor}</td>
                            <td className="py-2 pr-3 font-mono" style={{ color: b.agingActive ? "var(--color-amber)" : undefined }}>
                              +{b.agingBonus}
                            </td>
                            <td className="py-2 pr-3 font-mono">+{b.emergencyModifier}</td>
                            <td className="py-2 pr-3 font-mono">+{b.registrationVariance}</td>
                            <td className="py-2 pr-3 font-mono text-[var(--color-ink-mute)]">
                              {initial ? Math.round(initial.finalScore) : "—"}
                            </td>
                            <td className="py-2 pr-3 font-mono font-semibold text-[var(--color-emerald)]">{Math.round(b.finalScore)}</td>
                            <td className="py-2 pr-3 font-mono">#{i + 1}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="flex flex-col gap-6">
              <Card
                className="p-5"
                style={{
                  background: safe ? "var(--color-emerald-soft)" : "var(--color-coral-soft)",
                }}
              >
                <div className="flex items-center gap-2 mb-3" style={{ color: safe ? "var(--color-emerald)" : "var(--color-coral)" }}>
                  {safe ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span className="text-xs font-semibold uppercase tracking-wide">Starvation Safety Test</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span>Maximum possible non-severity boost</span>
                  <span className="font-mono font-semibold">{Math.round(maxBoost)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span>Minimum severity gap</span>
                  <span className="font-mono font-semibold">{tierGap}</span>
                </div>
                <div className="h-px bg-current opacity-20 my-2" />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Safety margin</span>
                  <span className="font-mono">{Math.round(tierGap - maxBoost)}</span>
                </div>
                <p className="text-xs mt-3 opacity-80 leading-relaxed">
                  Computed live from the current weights (wait cap {weights.waitFactorCap} + aging cap {weights.agingCap} +
                  emergency {weights.emergencyWeight} + intake variance {REGISTRATION_VARIANCE_MAX}) against the{" "}
                  {SEVERITY_BASE[1] - SEVERITY_BASE[2]}-point tier gap. Change weights in Settings to see this break.
                </p>
              </Card>

              <Card padding="sm" className="px-4 py-3">
                <Link to="/app/settings" className="text-xs text-[var(--color-emerald)] font-medium hover:underline">
                  Open Settings to tune weights →
                </Link>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OrderColumn({ title, ids, patients }: { title: string; ids: string[]; patients: { id: string; name: string }[] }) {
  return (
    <div>
      <div className="text-xs font-semibold text-[var(--color-ink-mute)] uppercase tracking-wide mb-2">{title}</div>
      <div className="flex flex-col gap-1.5">
        {ids.map((id, i) => {
          const p = patients.find((pt) => pt.id === id);
          return (
            <div key={id} className="flex items-center gap-2 rounded-lg border border-[var(--color-line-soft)] px-2.5 py-1.5 text-xs">
              <span className="font-mono text-[var(--color-ink-mute)] w-4">{i + 1}</span>
              <span className="truncate">{p?.name ?? id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
