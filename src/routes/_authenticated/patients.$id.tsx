import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patients/$id")({
  component: PatientDetail,
});

function PatientDetail() {
  const { id } = useParams({ from: "/_authenticated/patients/$id" });
  const { hospital, role } = useKairos();
  const [patient, setPatient] = useState<any>(null);
  const [vitals, setVitals] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [queueEntry, setQueueEntry] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  const load = async () => {
    if (!hospital?.id) return;
    const [p, v, c, rx, lb, qe, dp] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).maybeSingle(),
      supabase.from("vitals").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("consultations").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("prescriptions").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("lab_orders").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("queue_entries").select("*").eq("patient_id", id).not("status", "eq", "completed").maybeSingle(),
      supabase.from("departments").select("*").eq("hospital_id", hospital.id),
    ]);
    setPatient(p.data);
    setVitals(v.data ?? []);
    setConsultations(c.data ?? []);
    setPrescriptions(rx.data ?? []);
    setLabs(lb.data ?? []);
    setQueueEntry(qe.data);
    setDepartments(dp.data ?? []);
  };

  useEffect(() => { load(); }, [id, hospital?.id]);

  const checkIn = async (departmentId: string, urgency: string) => {
    if (!hospital?.id) return;
    const { error } = await supabase.from("queue_entries").insert({
      hospital_id: hospital.id,
      patient_id: id,
      department_id: departmentId || null,
      urgency,
      status: "waiting",
    });
    if (error) return toast.error(error.message);
    toast.success("Patient added to queue");
    await supabase.from("notifications").insert({
      hospital_id: hospital.id,
      type: "queue_updated",
      message: `${patient?.full_name} added to the queue (${urgency})`,
    });
    load();
  };

  if (!patient) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <div className="mb-4">
        <Link to="/patients" className="text-sm text-slate-500 hover:text-slate-900">← All patients</Link>
      </div>

      <PageHeader
        title={patient.full_name}
        subtitle={`${patient.patient_code} · ${patient.gender ?? "—"} · DOB ${patient.date_of_birth ?? "—"}`}
        actions={
          !queueEntry && (role === "nurse" || role === "reception" || role === "admin") && (
            <CheckInButton departments={departments} onCheckIn={checkIn} />
          )
        }
      />

      {queueEntry && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-blue-700">Currently in queue</div>
            <div className="text-sm mt-1">Status: <b>{queueEntry.status.replace(/_/g, " ")}</b> · Urgency: <b>{queueEntry.urgency}</b></div>
          </div>
          <Link to="/queue" className="text-sm text-blue-700 hover:text-blue-900">View queue →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Contact & personal">
          <Row label="Phone" value={patient.phone} />
          <Row label="Address" value={patient.address} />
          <Row label="Emergency" value={patient.emergency_contact_name ? `${patient.emergency_contact_name} · ${patient.emergency_contact_phone}` : null} />
          <Row label="Insurance" value={patient.insurance_provider ? `${patient.insurance_provider} (${patient.insurance_number ?? "—"})` : null} />
        </Section>

        <Section title="Medical history">
          <Row label="Allergies" value={patient.allergies} />
          <Row label="Chronic illnesses" value={patient.chronic_illnesses} />
          <Row label="Medications" value={patient.medications} />
        </Section>

        <Section title="Latest vitals">
          {vitals[0] ? (
            <div className="text-sm space-y-1">
              <Row label="BP" value={vitals[0].blood_pressure} />
              <Row label="HR" value={vitals[0].heart_rate ? `${vitals[0].heart_rate} bpm` : null} />
              <Row label="SpO₂" value={vitals[0].oxygen_saturation ? `${vitals[0].oxygen_saturation}%` : null} />
              <Row label="Temp" value={vitals[0].temperature ? `${vitals[0].temperature}°C` : null} />
              <Row label="Weight" value={vitals[0].weight ? `${vitals[0].weight} kg` : null} />
              <Row label="Recorded" value={new Date(vitals[0].created_at).toLocaleString()} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No vitals recorded.</p>
          )}
        </Section>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold mb-3">Consultation history</h3>
        {consultations.length === 0 ? (
          <p className="text-sm text-slate-500">No consultations yet.</p>
        ) : (
          <div className="space-y-3">
            {consultations.map((c) => (
              <div key={c.id} className="border-l-2 border-blue-500 pl-3 py-1">
                <div className="text-xs text-slate-500">{new Date(c.created_at).toLocaleString()}</div>
                {c.complaint && <div className="text-sm mt-1"><b>Complaint:</b> {c.complaint}</div>}
                {c.diagnosis && <div className="text-sm"><b>Diagnosis:</b> {c.diagnosis}</div>}
                {c.notes && <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{c.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-3">Prescriptions</h3>
          {prescriptions.length === 0 ? <p className="text-sm text-slate-500">None.</p> : (
            <div className="space-y-2 text-sm">
              {prescriptions.map((p) => (
                <div key={p.id} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{p.medication}</div>
                    <div className="text-xs text-slate-500">{p.dosage} · {p.instructions}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-3">Lab orders</h3>
          {labs.length === 0 ? <p className="text-sm text-slate-500">None.</p> : (
            <div className="space-y-2 text-sm">
              {labs.map((l) => (
                <div key={l.id} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{l.test_name}</div>
                    {l.results && <div className="text-xs text-slate-500">{l.results}</div>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckInButton({ departments, onCheckIn }: { departments: any[]; onCheckIn: (dep: string, urg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [dep, setDep] = useState("");
  const [urg, setUrg] = useState("routine");
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-lg"
      >
        Check in to queue
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-72 z-10">
          <label className="text-xs font-medium block mb-1">Department</label>
          <select value={dep} onChange={(e) => setDep(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3">
            <option value="">Any / General</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <label className="text-xs font-medium block mb-1">Urgency</label>
          <select value={urg} onChange={(e) => setUrg(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3">
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
          <button
            onClick={() => { onCheckIn(dep, urg); setOpen(false); }}
            className="w-full bg-slate-900 text-white text-sm font-semibold py-2 rounded-lg"
          >
            Add to queue
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="text-sm space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-slate-500 text-xs uppercase tracking-wide">{label}</span>
      <span className="text-slate-800 text-right">{value || "—"}</span>
    </div>
  );
}
