import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { createStaffUser } from "@/lib/kairos.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
});

function StaffPage() {
  const { hospital, role } = useKairos();
  const create = useServerFn(createStaffUser);
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "doctor" as "doctor" | "nurse" | "reception" | "admin",
    departmentId: "",
  });
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null);

  const load = async () => {
    if (!hospital?.id) return;
    const [{ data: p }, { data: r }, { data: d }] = await Promise.all([
      supabase.from("profiles").select("*, departments(name)").eq("hospital_id", hospital.id),
      supabase.from("user_roles").select("*").eq("hospital_id", hospital.id),
      supabase.from("departments").select("*").eq("hospital_id", hospital.id),
    ]);
    const roleMap = new Map<string, string>();
    (r ?? []).forEach((row: any) => roleMap.set(row.user_id, row.role));
    setStaff((p ?? []).map((profile: any) => ({ ...profile, role: roleMap.get(profile.user_id) ?? "—" })));
    setDepartments(d ?? []);
  };

  useEffect(() => { load(); }, [hospital?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await create({ data: { ...form, departmentId: form.departmentId || null } });
      setLastCreated({ email: form.email, password: form.password });
      toast.success("Staff account created");
      setForm({ fullName: "", email: "", password: "", role: "doctor", departmentId: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (role !== "admin") {
    return <div className="text-slate-500">Admins only.</div>;
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={`${staff.length} team members`}
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + Invite staff
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Department</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s: any) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3">{s.email}</td>
                <td className="px-4 py-3 capitalize">{s.role}</td>
                <td className="px-4 py-3">{s.departments?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${s.online ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                    {s.online ? "online" : "offline"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold">Invite staff member</h2>
              <button type="button" onClick={() => { setShowNew(false); setLastCreated(null); }} className="text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-3">
              {lastCreated && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-green-800 mb-1">Account created</div>
                  <div className="text-green-700">Email: <b>{lastCreated.email}</b></div>
                  <div className="text-green-700">Password: <code className="bg-white px-1 rounded">{lastCreated.password}</code></div>
                  <div className="text-xs text-green-600 mt-1">Share these credentials securely with the staff member.</div>
                </div>
              )}
              <F label="Full name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} required />
              <F label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
              <F label="Temporary password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
              <div>
                <label className="text-xs font-medium block mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="reception">Reception</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Department (optional)</label>
                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowNew(false); setLastCreated(null); }} className="px-4 py-2 text-sm">Close</button>
              <button type="submit" disabled={saving} className="bg-slate-900 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
                {saving ? "Creating…" : "Create staff account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function F({ label, value, onChange, type = "text", required }: any) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1">{label}{required && " *"}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}
