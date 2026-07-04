import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/appointments")({
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { hospital } = useKairos();
  const [appts, setAppts] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ patient_id: "", department_id: "", scheduled_at: "", reason: "" });

  const load = async () => {
    if (!hospital?.id) return;
    const [{ data: a }, { data: p }, { data: d }] = await Promise.all([
      supabase.from("appointments").select("*, patients(full_name, patient_code), departments(name)").eq("hospital_id", hospital.id).order("scheduled_at"),
      supabase.from("patients").select("id, full_name, patient_code").eq("hospital_id", hospital.id),
      supabase.from("departments").select("*").eq("hospital_id", hospital.id),
    ]);
    setAppts(a ?? []);
    setPatients(p ?? []);
    setDepartments(d ?? []);
  };

  useEffect(() => { load(); }, [hospital?.id]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital?.id) return;
    const { error } = await supabase.from("appointments").insert({
      hospital_id: hospital.id,
      patient_id: form.patient_id,
      department_id: form.department_id || null,
      scheduled_at: form.scheduled_at,
      reason: form.reason || null,
      status: "scheduled",
    });
    if (error) return toast.error(error.message);
    toast.success("Appointment scheduled");
    setShowNew(false);
    setForm({ patient_id: "", department_id: "", scheduled_at: "", reason: "" });
    load();
  };

  const cancel = async (id: string) => {
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Appointments"
        actions={
          <button onClick={() => setShowNew(true)} className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            + New appointment
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">When</th>
              <th className="text-left px-4 py-3">Patient</th>
              <th className="text-left px-4 py-3">Department</th>
              <th className="text-left px-4 py-3">Reason</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {appts.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500">No appointments yet.</td></tr>}
            {appts.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{new Date(a.scheduled_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{a.patients?.full_name}</td>
                <td className="px-4 py-3">{a.departments?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{a.reason ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{a.status}</td>
                <td className="px-4 py-3 text-right">
                  {a.status !== "cancelled" && (
                    <button onClick={() => cancel(a.id)} className="text-xs text-red-600 hover:text-red-500">Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={create} className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
            <h2 className="font-semibold">New appointment</h2>
            <div>
              <label className="text-xs font-medium block mb-1">Patient</label>
              <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.patient_code})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Department</label>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Any</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Date & time</label>
              <input required type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Reason</label>
              <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 text-sm">Cancel</button>
              <button type="submit" className="bg-slate-900 text-white text-sm font-semibold px-5 py-2 rounded-lg">Schedule</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
