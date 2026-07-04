import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { StatusBadge, UrgencyBadge } from "./dashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/queue")({
  component: QueuePage,
});

const NEXT_STATUS: Record<string, string> = {
  checked_in: "waiting",
  waiting: "called",
  called: "in_consultation",
  in_consultation: "completed",
};

function QueuePage() {
  const { hospital, role, userId } = useKairos();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<any[]>([]);
  const [triage, setTriage] = useState<any | null>(null);

  const load = async () => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("queue_entries")
      .select("*, patients(full_name, patient_code, date_of_birth), departments(name)")
      .eq("hospital_id", hospital.id)
      .neq("status", "completed")
      .order("urgency", { ascending: false })
      .order("checked_in_at", { ascending: true });
    setEntries(data ?? []);
  };

  useEffect(() => {
    load();
    if (!hospital?.id) return;
    const ch = supabase
      .channel(`queue-${hospital.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries", filter: `hospital_id=eq.${hospital.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hospital?.id]);

  const advance = async (entry: any) => {
    const next = NEXT_STATUS[entry.status];
    if (!next) return;
    const update: any = { status: next };
    if (next === "in_consultation" && role === "doctor") update.assigned_doctor = userId;
    const { error } = await supabase.from("queue_entries").update(update).eq("id", entry.id);
    if (error) return toast.error(error.message);
    if (next === "in_consultation") navigate({ to: "/consultation/$id", params: { id: entry.id } });
  };

  return (
    <div>
      <PageHeader title="Queue" subtitle={`${entries.length} active`} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Patient</th>
              <th className="text-left px-4 py-3">Department</th>
              <th className="text-left px-4 py-3">Urgency</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Waiting</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">Queue is empty.</td></tr>
            )}
            {entries.map((e) => {
              const mins = Math.round((Date.now() - new Date(e.checked_in_at).getTime()) / 60000);
              return (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to="/patients/$id" params={{ id: e.patient_id }} className="font-medium hover:text-blue-600">
                      {e.patients?.full_name}
                    </Link>
                    <div className="text-xs text-slate-500 font-mono">{e.patients?.patient_code}</div>
                  </td>
                  <td className="px-4 py-3">{e.departments?.name ?? "—"}</td>
                  <td className="px-4 py-3"><UrgencyBadge urgency={e.urgency} /></td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{mins} min</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {(role === "nurse" || role === "admin") && (
                      <button
                        onClick={() => setTriage(e)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-md"
                      >
                        Triage
                      </button>
                    )}
                    {NEXT_STATUS[e.status] && (role === "admin" || role === "doctor" || role === "nurse" || role === "reception") && (
                      <button
                        onClick={() => advance(e)}
                        className="text-xs bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded-md font-medium"
                      >
                        → {NEXT_STATUS[e.status].replace(/_/g, " ")}
                      </button>
                    )}
                    {e.status === "in_consultation" && role === "doctor" && (
                      <Link to="/consultation/$id" params={{ id: e.id }} className="text-xs bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded-md font-medium">
                        Open
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {triage && <TriageDialog entry={triage} onClose={() => setTriage(null)} onSaved={load} />}
    </div>
  );
}

function TriageDialog({ entry, onClose, onSaved }: { entry: any; onClose: () => void; onSaved: () => void }) {
  const { hospital, userId } = useKairos();
  const [form, setForm] = useState({
    blood_pressure: "",
    heart_rate: "",
    oxygen_saturation: "",
    respiratory_rate: "",
    temperature: "",
    weight: "",
    height: "",
    notes: "",
    urgency: entry.urgency,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital?.id) return;
    setSaving(true);
    const { error } = await supabase.from("vitals").insert({
      hospital_id: hospital.id,
      patient_id: entry.patient_id,
      recorded_by: userId || null,
      blood_pressure: form.blood_pressure || null,
      heart_rate: form.heart_rate ? Number(form.heart_rate) : null,
      oxygen_saturation: form.oxygen_saturation ? Number(form.oxygen_saturation) : null,
      respiratory_rate: form.respiratory_rate ? Number(form.respiratory_rate) : null,
      temperature: form.temperature ? Number(form.temperature) : null,
      weight: form.weight ? Number(form.weight) : null,
      height: form.height ? Number(form.height) : null,
      notes: form.notes || null,
    });
    if (error) { setSaving(false); return toast.error(error.message); }
    await supabase.from("queue_entries").update({ urgency: form.urgency }).eq("id", entry.id);
    setSaving(false);
    toast.success("Triage recorded");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Triage · {entry.patients?.full_name}</h2>
            <div className="text-xs text-slate-500">{entry.patients?.patient_code}</div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          <TF label="Blood pressure" value={form.blood_pressure} onChange={(v) => setForm({ ...form, blood_pressure: v })} placeholder="120/80" />
          <TF label="Heart rate (bpm)" value={form.heart_rate} onChange={(v) => setForm({ ...form, heart_rate: v })} type="number" />
          <TF label="SpO₂ (%)" value={form.oxygen_saturation} onChange={(v) => setForm({ ...form, oxygen_saturation: v })} type="number" />
          <TF label="Respiratory rate" value={form.respiratory_rate} onChange={(v) => setForm({ ...form, respiratory_rate: v })} type="number" />
          <TF label="Temperature (°C)" value={form.temperature} onChange={(v) => setForm({ ...form, temperature: v })} type="number" />
          <TF label="Weight (kg)" value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} type="number" />
          <TF label="Height (cm)" value={form.height} onChange={(v) => setForm({ ...form, height: v })} type="number" />
          <div>
            <label className="text-xs font-medium block mb-1">Urgency</label>
            <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium block mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="bg-slate-900 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
            {saving ? "Saving…" : "Save vitals"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TF({ label, value, onChange, type = "text", placeholder }: any) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}
