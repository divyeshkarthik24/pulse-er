import { useMemo } from "react";
import { Card, SectionHeading } from "../components/common/Card";
import { FormulaDiagram } from "../components/explain/FormulaDiagram";
import { useERStore } from "../store/useERStore";
import { TriageEngine } from "../dsa/TriageEngine";
import { PriorityCalculator } from "../dsa/PriorityCalculator";
import { randomVitals } from "../data/randomPatient";
import { SEVERITY_BASE, SEVERITY_META, REGISTRATION_VARIANCE_MAX } from "../types";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Compass,
  GitBranch,
  Scale,
  ShieldCheck,
  Sigma,
  Timer,
} from "lucide-react";

const worked = new TriageEngine();

export function AboutAlgorithmPage() {
  const weights = useERStore((s) => s.weights);

  // A deterministic worked example, generated from the real production
  // engine (not hardcoded) — same classes, same formula, the live app uses.
  const example = useMemo(() => {
    const calculator = new PriorityCalculator(weights);
    const arrivalTime = Date.now() - 25 * 60000; // arrived 25 minutes ago
    const patient = worked.createPatient({
      name: "P104",
      age: 47,
      gender: "Other",
      symptoms: ["Shortness of breath"],
      severity: 2,
      vitals: randomVitals(2),
      isEmergency: true,
      arrivalTime,
    });
    patient.registrationVariance = 12; // fixed, for a reproducible worked example
    const breakdown = calculator.compute(patient, Date.now());
    patient.priorityBreakdown = breakdown;
    patient.priorityScore = breakdown.finalScore;
    return patient;
  }, [weights]);

  const maxBoost =
    weights.waitFactorCap + weights.agingCap + weights.emergencyWeight + REGISTRATION_VARIANCE_MAX;
  const tierGap = SEVERITY_BASE[1] - SEVERITY_BASE[2];
  const safetyMargin = tierGap - maxBoost;
  const safe = safetyMargin > 0;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2.5">
          <BookOpen className="text-[var(--color-emerald)]" /> About the Algorithm
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">
          Written for a judge who has never seen a heap before. Pulse ER is an educational simulation —
          not a real clinical triage tool.
        </p>
      </div>

      <Card>
        <SectionHeading eyebrow="The problem" title="Why not just FIFO?" />
        <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
          A plain first-come-first-served queue treats a sprained ankle and a cardiac arrest identically if
          they arrive moments apart — clearly unsafe in an ER. But swinging to the opposite extreme and always
          treating by severity alone creates a different failure: a patient with a mild complaint could, in
          principle, wait forever if more urgent patients keep arriving. The problem statement explicitly asks
          for a balance: <em>prioritize by urgency, but stay fair among patients of similar severity.</em>
        </p>
      </Card>

      <Card>
        <SectionHeading eyebrow="The data structure" title="Why a Priority Queue (binary heap)?" />
        <p className="text-sm leading-relaxed text-[var(--color-ink-soft)] mb-4">
          A priority queue always exposes the single most urgent patient in constant time, and both inserting
          a new arrival and removing the most urgent patient cost O(log n) — regardless of how many patients
          are already waiting. The alternative, re-sorting an array on every change, costs O(n log n) per
          change. For a queue that mutates every few seconds (new arrivals, aging ticks, escalations), that
          difference compounds quickly.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { op: "Insert", big: "O(log n)" },
            { op: "Extract-max", big: "O(log n)" },
            { op: "Peek", big: "O(1)" },
          ].map((c) => (
            <div key={c.op} className="rounded-xl border border-[var(--color-line)] p-4 text-center">
              <div className="text-xs text-[var(--color-ink-mute)] mb-1">{c.op}</div>
              <div className="font-mono text-lg font-bold text-[var(--color-emerald)]">{c.big}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading eyebrow="The formula" title="How priority is calculated" icon={<Sigma size={20} />} />
        <div className="rounded-xl bg-[var(--color-paper-dim)] p-4 font-mono text-xs leading-relaxed mb-4 overflow-x-auto">
          score = severityBase<br />
          &nbsp;&nbsp;+ min(waitMinutes × waitWeight, waitFactorCap)<br />
          &nbsp;&nbsp;+ agingBonus&nbsp;&nbsp;<span className="text-[var(--color-ink-mute)]"># only after an aging threshold</span><br />
          &nbsp;&nbsp;+ (isEmergency ? emergencyWeight : 0)<br />
          &nbsp;&nbsp;+ registrationVariance&nbsp;&nbsp;<span className="text-[var(--color-ink-mute)]"># small one-time intake variance, see below</span><br />
          &nbsp;&nbsp;− tieBreaker&nbsp;&nbsp;<span className="text-[var(--color-ink-mute)]"># breaks genuine exact ties</span>
        </div>
        <p className="text-sm leading-relaxed text-[var(--color-ink-soft)] mb-3">
          Each severity tier has a large fixed base score, spaced {tierGap} points apart:
        </p>
        <div className="grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as const).map((sev) => (
            <div key={sev} className="text-center rounded-lg border border-[var(--color-line)] py-2">
              <div className="text-[10px] font-semibold" style={{ color: SEVERITY_META[sev].color }}>
                {SEVERITY_META[sev].label}
              </div>
              <div className="font-mono text-sm font-bold">{SEVERITY_BASE[sev]}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading
          eyebrow="Three different ideas"
          title="Urgency, fairness, and tie-breaking are not the same thing"
          icon={<Compass size={20} />}
        />
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <ConceptCard
            color="var(--color-coral)"
            title="1. Urgency"
            body="Driven by clinical severity: the severity base and the emergency modifier. This is what decides which tier a patient is in, and it dominates everything else by construction."
          />
          <ConceptCard
            color="var(--color-emerald)"
            title="2. Fairness"
            body="Waiting credit, the aging bonus, and intake variance. Exists only to stop a patient being indefinitely disadvantaged by queue position or luck — it can never cross a severity tier."
          />
          <ConceptCard
            color="var(--color-steel)"
            title="3. Tie-breaking"
            body="Arrival sequence, scaled to about 1/10,000th of a point. It only resolves patients who are otherwise exactly equal — it never influences a real decision on its own."
          />
        </div>
        <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
          These are deliberately kept separate in the engine's own data (see <code>PriorityBreakdown</code>) and
          in every place the app explains a decision — the Explainability Panel, the Fairness Challenge, and the
          diagram below all read the same three groupings, so there is never a mismatch between what's displayed
          and what the heap actually compared.
        </p>
      </Card>

      <Card>
        <SectionHeading
          eyebrow="Live, from the real engine"
          title="Formula visualization"
          description="Not illustrative numbers — this is patient P104's actual computed breakdown, right now, under the current Settings weights."
        />
        <FormulaDiagram breakdown={example.priorityBreakdown} />
      </Card>

      <Card>
        <SectionHeading eyebrow="Worked example" title={`Patient ${example.id} — a viva-ready walkthrough`} />
        <p className="text-sm text-[var(--color-ink-soft)] mb-3">
          Urgent severity, flagged emergency, arrived 25 minutes ago, intake variance fixed at 12 for
          reproducibility. Computed by the same <code>PriorityCalculator</code> instance the live app uses —
          change the weights in Settings and this example recalculates.
        </p>
        <div className="rounded-xl bg-[var(--color-paper-dim)] p-4 font-mono text-xs leading-loose">
          <Row label="Severity Base" value={example.priorityBreakdown.severityBase} />
          <Row label="Emergency Bonus" value={example.priorityBreakdown.emergencyModifier} />
          <Row label="Waiting Credit" value={example.priorityBreakdown.waitFactor} />
          <Row label="Aging Bonus" value={example.priorityBreakdown.agingBonus} />
          <Row label="Intake Variance" value={example.priorityBreakdown.registrationVariance} />
          <div className="border-t border-[var(--color-line)] my-1.5" />
          <Row label="Effective Priority" value={example.priorityBreakdown.finalScore} bold />
        </div>
      </Card>

      <Card>
        <SectionHeading eyebrow="Fairness" title="How aging prevents starvation" icon={<Scale size={20} />} />
        <p className="text-sm leading-relaxed text-[var(--color-ink-soft)] mb-3">
          A subtlety worth being honest about: if same-severity patients were ordered by arrival time alone, aging
          could never actually change anything. Both patients' wait credit grows at the same rate, so the one who
          arrived first always stays first — the ordering would already be permanently "fair" with nothing left
          for aging to fix. That's why each patient also gets a small, one-time, bounded{" "}
          <strong>intake variance</strong> (0–{REGISTRATION_VARIANCE_MAX} points) rolled at registration.
        </p>
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-dim)] p-4 mb-3">
          <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
            <strong className="text-[var(--color-ink)]">What intake variance represents:</strong> a simulation
            mechanism standing in for small intake/assessment differences within the same broad severity category
            — which nurse triaged a patient, minor documentation lag, which bed opened up first — so that the
            aging mechanism has something real to correct over time. It is <strong>not</strong> a claim that real
            hospitals assign patients randomized numerical priority points. This is an educational scheduling
            model, not a clinical protocol.
          </p>
        </div>
        <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
          Consider two Moderate-severity patients: A arrives at 10:01 with average intake variance, B arrives at
          10:07 but happens to draw better variance — so B is initially ranked ahead of A despite arriving later.
          As B keeps waiting, A's waiting-time credit (and eventually aging bonus) grows faster than B's, since A
          has been waiting longer. Once A's accumulated credit closes the variance gap, A overtakes B — a real,
          visible reordering driven purely by fairness, not severity. It is still bounded, so this never lets a
          Moderate patient outrank a Critical one who arrived minutes ago.
        </p>
      </Card>

      <Card
        style={{ background: safe ? "var(--color-emerald-soft)" : "var(--color-coral-soft)" }}
      >
        <div className="flex items-center gap-2 mb-3" style={{ color: safe ? "var(--color-emerald)" : "var(--color-coral)" }}>
          {safe ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="text-xs font-semibold uppercase tracking-wide">Starvation-safety guarantee — live</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Stat label="Maximum boost" value={Math.round(maxBoost)} />
          <Stat label="Severity gap" value={tierGap} />
          <Stat label="Safety margin" value={Math.round(safetyMargin)} />
        </div>
        <p className="text-sm leading-relaxed" style={{ color: safe ? "var(--color-emerald)" : "var(--color-coral)" }}>
          {safe
            ? `Guarantee holds under the current Settings weights: waiting + aging + emergency + intake variance can add at most ${Math.round(maxBoost)} points, strictly less than the ${tierGap}-point gap between severity tiers. A lower-severity patient can never mathematically outrank a higher-severity one.`
            : `Guarantee broken under the current Settings weights: the maximum possible non-severity boost (${Math.round(maxBoost)}) now exceeds the ${tierGap}-point tier gap. With enough waiting, a lower-severity patient could outrank a higher-severity one. Open Settings to restore safe weights.`}
        </p>
      </Card>

      <Card>
        <SectionHeading eyebrow="Escalation" title="How emergency re-prioritization works" icon={<GitBranch size={20} />} />
        <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
          When a patient's condition changes — say, Moderate suddenly becomes Critical — the engine re-runs the
          scoring function for that one patient (O(log n) to fix the heap invariant via sift-up/sift-down) and
          the UI replays the resulting position change. No other patient needs to be touched; the heap repairs
          itself locally rather than re-sorting everything.
        </p>
      </Card>

      <Card>
        <SectionHeading eyebrow="Trade-offs" title="Honest limitations" icon={<ShieldCheck size={20} />} />
        <ul className="text-sm leading-relaxed text-[var(--color-ink-soft)] list-disc pl-5 space-y-1.5">
          <li>This is an educational simulation of triage logic — it does not replace clinical judgment and must never be used for real patient care, and makes no claim of medical or clinical validity.</li>
          <li>The starvation-safety guarantee holds for the default weights; loosening them in Settings can intentionally break it, for experimentation — the app detects and reports this live rather than hiding it.</li>
          <li>Priority recomputation for the whole queue is O(n) and runs periodically (ticks, escalations) rather than continuously, which is standard practice for time-decaying priority systems.</li>
          <li>Vitals-based severity suggestions are a simple heuristic, not a validated clinical scoring system (e.g. not a real ESI/triage protocol).</li>
          <li>Queue Replay reconstructs historical ordering using the scheduler configuration that was actually active at each moment (see Queue Replay), but still approximates heap array layout rather than the literal historical array.</li>
        </ul>
      </Card>

      <Card>
        <SectionHeading eyebrow="At a glance" title="Space complexity" icon={<Timer size={20} />} />
        <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
          The heap stores one array slot per waiting patient: O(n) space, same as any array-based structure.
          No auxiliary pointer structures are needed because a binary heap's parent/child relationships are
          computed arithmetically from the index.
        </p>
      </Card>
    </div>
  );
}

function ConceptCard({ color, title, body }: { color: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: `color-mix(in srgb, ${color} 30%, var(--color-line))` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">{body}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-[var(--color-emerald)]" : ""}`}>
      <span className={bold ? "" : "text-[var(--color-ink-soft)]"}>{label}</span>
      <span>{Math.round(value * 10) / 10}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="font-mono text-xl font-bold">{value}</div>
    </div>
  );
}
