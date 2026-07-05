import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/consultation/$id")({
  component: ConsultationPage,
});

const RX_STATUS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-blue-100 text-blue-700",
  collected: "bg-emerald-100 text-emerald-700",
};

function ConsultationPage() {
  const { id } = useParams({ from: "/_authenticated/consultation/$id" });
  const { hospital, userId } = useKairos();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [vitals, setVitals] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [consultation, setConsultation] = useState({ complaint: "", diagnosis: "", notes: "" });
  const [rx, setRx] = useState({ medication: "", dosage: "", instructions: "" });
  const [lab, setLab] = useState({ test_name: "" });
  const [ref, setRef] = useState({ target_department_id: "", target_specialist: "", reason: "", notes: "" });
  const [saved, setSaved] = useState<{ prescriptions: any[]; labs: any[]; referrals: any[] }>({ prescriptions: [], labs: [], referrals: [] });
  const [departments, setDepartments] = useState<any[]>([]);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hospital?.id) return;
    const load = async () => {
      const { data: e } = await supabase.from("queue_entries").select("*, patients(*)").eq("id", id).maybeSingle();
      setEntry(e);
      setPatient(e?.patients);
      const { data: deps } = await supabase.from("departments").select("*").eq("hospital_id", hospital.id);
      setDepartments(deps ?? []);
      if (e?.patient_id) {
        const [{ data: v }, { data: h }] = await Promise.all([
          supabase.from("vitals").select("*").eq("patient_id", e.patient_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("consultations").select("*").eq("patient_id", e.patient_id).order("created_at", { ascending: false }).limit(3),
        ]);
        setVitals(v);
        setHistory(h ?? []);
      }
    };
    load();
  }, [id, hospital?.id]);

  const saveConsultation = async () => {
    if (!hospital?.id || !patient) return;
    setSaving(true);
    if (consultationId) {
      const { error } = await supabase
        .from("consultations")
        .update({
          complaint: consultation.complaint || null,
          diagnosis: consultation.diagnosis || null,
          notes: consultation.notes || null,
        })
        .eq("id", consultationId);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Consultation updated");
      return;
    }
    const { data, error } = await supabase
      .from("consultations")
      .insert({
        hospital_id: hospital.id,
        patient_id: patient.id,
        doctor_id: userId || null,
        complaint: consultation.complaint || null,
        diagnosis: consultation.diagnosis || null,
        notes: consultation.notes || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setConsultationId(data.id);
    toast.success("Consultation saved");
  };

  const addRx = async () => {
    if (!hospital?.id || !patient || !rx.medication) return;
    const { data, error } = await supabase
      .from("prescriptions")
      .insert({
        hospital_id: hospital.id,
        patient_id: patient.id,
        prescribed_by: userId || null,
        consultation_id: consultationId,
        medication: rx.medication,
        dosage: rx.dosage,
        instructions: rx.instructions,
        status: "pending",
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setSaved((s) => ({ ...s, prescriptions: [...s.prescriptions, data] }));
    setRx({ medication: "", dosage: "", instructions: "" });
    await supabase.from("notifications").insert({
      hospital_id: hospital.id,
      type: "new_prescription",
      message: `New prescription for ${patient.full_name}: ${rx.medication}`,
    });
    toast.success("Sent to pharmacy");
  };

  const addLab = async () => {
    if (!hospital?.id || !patient || !lab.test_name) return;
    const { data, error } = await supabase
      .from("lab_orders")
      .insert({
        hospital_id: hospital.id,
        patient_id: patient.id,
        ordered_by: userId || null,
        consultation_id: consultationId,
        test_name: lab.test_name,
        status: "ordered",
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setSaved((s) => ({ ...s, labs: [...s.labs, data] }));
    setLab({ test_name: "" });
    await supabase.from("notifications").insert({
      hospital_id: hospital.id,
      type: "new_lab_order",
      message: `Lab test ordered for ${patient.full_name}: ${lab.test_name}`,
    });
    toast.success("Lab order created");
  };

  const addReferral = async () => {
    if (!hospital?.id || !patient || (!ref.target_department_id && !ref.target_specialist)) return;
    const { data, error } = await supabase
      .from("referrals")
      .insert({
        hospital_id: hospital.id,
        patient_id: patient.id,
        referred_by: userId || null,
        target_department_id: ref.target_department_id || null,
        target_specialist: ref.target_specialist || null,
        reason: ref.reason || null,
        notes: ref.notes || null,
        status: "pending",
      })
      .select("*, departments(name)")
      .single();
    if (error) return toast.error(error.message);
    setSaved((s) => ({ ...s, referrals: [...s.referrals, data] }));
    setRef({ target_department_id: "", target_specialist: "", reason: "", notes: "" });
    await supabase.from("notifications").insert({
      hospital_id: hospital.id,
      type: "new_referral",
      message: `Referral sent for ${patient.full_name} → ${data.departments?.name ?? data.target_specialist}`,
    });
    toast.success("Referral sent");
  };

  const complete = async () => {
    await supabase.from("queue_entries").update({ status: "completed" }).eq("id", id);
    await supabase.from("notifications").insert({
      hospital_id: hospital!.id,
      type: "consultation_complete",
      message: `Consultation completed for ${patient.full_name}`,
    });
    toast.success("Consultation complete");
    navigate({ to: "/queue" });
  };

  if (!entry || !patient) return <div className="text-slate-500">Loading…</div>;

  return (
    <div>
      <Link to="/queue" className="text-sm text-slate-500 hover:text-slate-900">← Queue</Link>
      <PageHeader
        title={`Consultation · ${patient.full_name}`}
        subtitle={`${patient.patient_code} · ${patient.gender ?? "—"} · DOB ${patient.date_of_birth ?? "—"}`}
        actions={
          <button onClick={complete} className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            Mark complete
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold mb-3">Consultation notes</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Chief complaint</label>
                <textarea value={consultation.complaint} onChange={(e) => setConsultation({ ...consultation, complaint: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Diagnosis</label>
                <input value={consultation.diagnosis} onChange={(e) => setConsultation({ ...consultation, diagnosis: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Clinical notes</label>
                <textarea value={consultation.notes} onChange={(e) => setConsultation({ ...consultation, notes: e.target.value })} rows={5} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={saveConsultation} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
                {saving ? "Saving…" : consultationId ? "Update consultation" : "Save consultation"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold mb-3">Prescribe medication</h3>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Medication" value={rx.medication} onChange={(e) => setRx({ ...rx, medication: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Dosage" value={rx.dosage} onChange={(e) => setRx({ ...rx, dosage: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Instructions" value={rx.instructions} onChange={(e) => setRx({ ...rx, instructions: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={addRx} className="mt-3 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-lg">Send to pharmacy</button>
            {saved.prescriptions.length > 0 && (
              <div className="mt-4 space-y-1 text-sm">
                {saved.prescriptions.map((p) => (
                  <div key={p.id} className="flex justify-between items-center border-b border-slate-100 py-1.5">
                    <span>{p.medication} · <span className="text-slate-500">{p.dosage}</span></span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${RX_STATUS[p.status] ?? RX_STATUS.pending}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold mb-3">Order lab tests</h3>
            <div className="flex gap-2">
              <input placeholder="Test name (e.g. Full blood count)" value={lab.test_name} onChange={(e) => setLab({ test_name: e.target.value })} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <button onClick={addLab} className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-lg">Order</button>
            </div>
            {saved.labs.length > 0 && (
              <div className="mt-3 space-y-1 text-sm">
                {saved.labs.map((l) => (
                  <div key={l.id} className="flex justify-between border-b border-slate-100 py-1.5">
                    <span>{l.test_name}</span>
                    <span className="text-xs text-slate-500">{l.status.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold mb-3">Refer to specialist</h3>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={ref.target_department_id}
                onChange={(e) => setRef({ ...ref, target_department_id: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select department…</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input
                placeholder="Or specialist name"
                value={ref.target_specialist}
                onChange={(e) => setRef({ ...ref, target_specialist: e.target.value })}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <input
              placeholder="Reason"
              value={ref.reason}
              onChange={(e) => setRef({ ...ref, reason: e.target.value })}
              className="w-full mt-2 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Clinical notes for the receiving team"
              rows={2}
              value={ref.notes}
              onChange={(e) => setRef({ ...ref, notes: e.target.value })}
              className="w-full mt-2 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={addReferral} className="mt-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold px-4 py-2 rounded-lg">Send referral</button>
            {saved.referrals.length > 0 && (
              <div className="mt-3 space-y-1 text-sm">
                {saved.referrals.map((r) => (
                  <div key={r.id} className="flex justify-between border-b border-slate-100 py-1.5">
                    <span>→ {r.departments?.name ?? r.target_specialist}</span>
                    <span className="text-xs text-slate-500">{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold mb-3">Patient snapshot</h3>
            <div className="text-sm space-y-1">
              <Row label="Allergies" value={patient.allergies} />
              <Row label="Chronic" value={patient.chronic_illnesses} />
              <Row label="Medications" value={patient.medications} />
              <Row label="Phone" value={patient.phone} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold mb-3">Latest vitals</h3>
            {vitals ? (
              <div className="text-sm space-y-1">
                <Row label="BP" value={vitals.blood_pressure} />
                <Row label="HR" value={vitals.heart_rate ? `${vitals.heart_rate} bpm` : null} />
                <Row label="SpO₂" value={vitals.oxygen_saturation ? `${vitals.oxygen_saturation}%` : null} />
                <Row label="Temp" value={vitals.temperature ? `${vitals.temperature}°C` : null} />
              </div>
            ) : <p className="text-sm text-slate-500">No vitals recorded.</p>}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold mb-3">Recent visits</h3>
            {history.length === 0 ? <p className="text-sm text-slate-500">No prior visits.</p> : (
              <div className="space-y-2 text-sm">
                {history.map((h) => (
                  <div key={h.id} className="border-l-2 border-blue-500 pl-2">
                    <div className="text-xs text-slate-500">{new Date(h.created_at).toLocaleDateString()}</div>
                    <div>{h.diagnosis ?? h.complaint ?? "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-slate-900 text-white rounded-xl p-5">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">AI Summary</div>
            <div className="text-sm text-slate-300">
              Gemini integration coming soon — this panel will surface an AI-generated summary of the patient's history, prior encounters, and open items.
            </div>
          </div>
        </div>
      </div>
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
