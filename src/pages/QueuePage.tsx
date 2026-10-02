import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { History, Rewind, Stethoscope, UserPlus } from "lucide-react";
import { useERStore } from "../store/useERStore";
import { PatientCard } from "../components/patient/PatientCard";
import { RegistrationModal } from "../components/patient/RegistrationModal";
import { PatientDetailModal } from "../components/patient/PatientDetailModal";
import { HeapVisualizer } from "../components/queue/HeapVisualizer";
import { ExplainabilityPanel } from "../components/explain/ExplainabilityPanel";
import { EventTimeline } from "../components/timeline/EventTimeline";
import { SimulationControls } from "../components/simulation/SimulationControls";
import { Button } from "../components/common/Button";
import { Card, SectionHeading } from "../components/common/Card";
import { useToastStore } from "../store/useToastStore";

export function QueuePage() {
  const sortedQueue = useERStore((s) => s.sortedQueue);
  const heapArray = useERStore((s) => s.heapArray);
  const lastHeapOps = useERStore((s) => s.lastHeapOps);
  const eventLog = useERStore((s) => s.eventLog);
  const callNextPatient = useERStore((s) => s.callNextPatient);
  const pushToast = useToastStore((s) => s.push);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [detailId, setDetailId] = useState<string | undefined>();
  const [showTimeline, setShowTimeline] = useState(false);

  const selectedPatient = sortedQueue.find((p) => p.id === selectedId) ?? sortedQueue[0];
  const detailPatient = sortedQueue.find((p) => p.id === detailId);

  function handleCallNext() {
    const p = callNextPatient();
    if (p) {
      pushToast({ title: `${p.name} called in`, description: `#${p.id} · ${p.triageCategory}`, tone: "success" });
    } else {
      pushToast({ title: "No doctor available", tone: "warning" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Live Priority Queue</h1>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">
            Ordered by effective priority — not strictly arrival order.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/dsa/replay">
            <Button variant="ghost">
              <Rewind size={15} /> Replay
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setShowTimeline((v) => !v)}>
            <History size={15} /> Timeline
          </Button>
          <Button variant="secondary" onClick={() => setRegisterOpen(true)}>
            <UserPlus size={15} /> Register patient
          </Button>
          <Button variant="primary" onClick={handleCallNext}>
            <Stethoscope size={15} /> Call next patient
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <SectionHeading
              eyebrow={`${sortedQueue.length} waiting`}
              title="Patient queue"
              description="Click a card to see exactly why it's positioned where it is."
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {sortedQueue.map((p, i) => (
                  <PatientCard
                    key={p.id}
                    patient={p}
                    rank={i + 1}
                    selected={p.id === selectedId}
                    onSelect={(pat) => {
                      setSelectedId(pat.id);
                      setDetailId(pat.id);
                    }}
                  />
                ))}
              </AnimatePresence>
              {sortedQueue.length === 0 && (
                <div className="col-span-2 text-center text-sm text-[var(--color-ink-mute)] py-10">
                  No one is waiting. Register a patient to see the heap in action.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {showTimeline ? (
            <Card>
              <SectionHeading eyebrow="Audit trail" title="Event timeline" />
              <EventTimeline events={eventLog} />
            </Card>
          ) : (
            <>
              <ExplainabilityPanel patient={selectedPatient} />
              <SimulationControls compact />
            </>
          )}
        </div>
      </div>

      <Card>
        <SectionHeading
          eyebrow="Make the DSA visible"
          title="Queue Intelligence — the heap, live"
          description="The exact binary max-heap backing this queue. Highlighted nodes show the most recent insert/extract operation."
          action={
            <Link to="/app/dsa/stepper" className="text-sm text-[var(--color-emerald)] font-medium hover:underline whitespace-nowrap">
              View Heap Operation →
            </Link>
          }
        />
        <HeapVisualizer heapArray={heapArray} ops={lastHeapOps} />
      </Card>

      <RegistrationModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
      <PatientDetailModal patient={detailPatient} onClose={() => setDetailId(undefined)} />
    </div>
  );
}
