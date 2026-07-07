import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import {
  createStaffUser,
  createStaffInvitation,
  revokeStaffInvitation,
  resendStaffInvitation,
} from "@/lib/kairos.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
});

function StaffPage() {
  const { hospital, role } = useKairos();
  const create = useServerFn(createStaffUser);
  const invite = useServerFn(createStaffInvitation);
  const revoke = useServerFn(revokeStaffInvitation);
  const resend = useServerFn(resendStaffInvitation);
  const [tab, setTab] = useState<"members" | "invites" | "activity">("members");
  const [staff, setStaff] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "doctor" as "doctor" | "nurse" | "reception" | "admin",
    departmentId: "",
  });
  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    role: "doctor" as "doctor" | "nurse" | "reception" | "admin",
    departmentId: "",
  });
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  const load = async () => {
    if (!hospital?.id) return;
    const [{ data: p }, { data: r }, { data: d }, { data: inv }, { data: ev }] = await Promise.all([
      supabase.from("profiles").select("*, departments(name)").eq("hospital_id", hospital.id),
      supabase.from("user_roles").select("*").eq("hospital_id", hospital.id),
      supabase.from("departments").select("*").eq("hospital_id", hospital.id),
      supabase
        .from("staff_invitations")
        .select("*, departments(name)")
        .eq("hospital_id", hospital.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("staff_invitation_events")
        .select("*")
        .eq("hospital_id", hospital.id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    const roleMap = new Map<string, string>();
    (r ?? []).forEach((row: any) => roleMap.set(row.user_id, row.role));
    setStaff((p ?? []).map((profile: any) => ({ ...profile, role: roleMap.get(profile.user_id) ?? "—" })));
    setDepartments(d ?? []);
    setInvitations(inv ?? []);
    setEvents(ev ?? []);

    const actorIds = Array.from(new Set((ev ?? []).map((e: any) => e.actor_id).filter(Boolean)));
    if (actorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", actorIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email || "Unknown"; });
      setActors(map);
    }
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

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await invite({
        data: {
          email: inviteForm.email,
          fullName: inviteForm.fullName || undefined,
          role: inviteForm.role,
          departmentId: inviteForm.departmentId || null,
        },
      });
      const link = `${window.location.origin}/invite/${res.token}`;
      setLastInviteLink(link);
      toast.success("Invitation created");
      setInviteForm({ fullName: "", email: "", role: "doctor", departmentId: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const doRevoke = async (id: string) => {
    if (!confirm("Revoke this invitation? The link will stop working immediately.")) return;
    setBusyId(id);
    try {
      await revoke({ data: { invitationId: id } });
      toast.success("Invitation revoked");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusyId(null); }
  };

  const doResend = async (id: string) => {
    setBusyId(id);
    try {
      const res = await resend({ data: { invitationId: id } });
      const link = `${window.location.origin}/invite/${res.token}`;
      try { await navigator.clipboard.writeText(link); } catch {}
      setLastInviteLink(link);
      setShowInvite(true);
      toast.success("New invitation link generated & copied");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusyId(null); }
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invitation link copied");
    } catch {
      prompt("Copy this invitation link:", link);
    }
  };

  const invStatus = (i: any): { label: string; className: string } => {
    if (i.revoked_at) return { label: "revoked", className: "bg-slate-100 text-slate-500" };
    if (i.accepted_at) return { label: "accepted", className: "bg-green-100 text-green-700" };
    if (new Date(i.expires_at) < new Date()) return { label: "expired", className: "bg-amber-100 text-amber-700" };
    return { label: "pending", className: "bg-blue-100 text-blue-700" };
  };

  if (role !== "admin") {
    return <div className="text-slate-500">Admins only.</div>;
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={`${staff.length} team members · ${invitations.filter((i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at) > new Date()).length} pending invitations`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowInvite(true)}
              className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              ✉ Send invitation
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              + Create account
            </button>
          </div>
        }
      />

      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(["members", "invites"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "members" ? "Team members" : `Invitations (${invitations.length})`}
          </button>
        ))}
      </div>

      {tab === "members" && (
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
      )}

      {tab === "invites" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {invitations.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No invitations yet. Click <b>Send invitation</b> to invite your first staff member.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Department</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Expires</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((i: any) => {
                  const st = invStatus(i);
                  const active = st.label === "pending";
                  return (
                    <tr key={i.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{i.email}</td>
                      <td className="px-4 py-3 capitalize">{i.role}</td>
                      <td className="px-4 py-3">{i.departments?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{new Date(i.expires_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right space-x-3">
                        {active && (
                          <>
                            <button onClick={() => copyLink(i.token)} className="text-blue-600 hover:underline text-xs font-medium">Copy link</button>
                            <button onClick={() => doRevoke(i.id)} className="text-red-600 hover:underline text-xs font-medium">Revoke</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={submitInvite} className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Send secure invitation</h2>
                <p className="text-[11px] text-slate-500">Expires in 7 days · single-use · revocable</p>
              </div>
              <button type="button" onClick={() => { setShowInvite(false); setLastInviteLink(null); }} className="text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-3">
              {lastInviteLink && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-2">
                  <div className="font-semibold text-blue-800">Invitation ready to share</div>
                  <input readOnly value={lastInviteLink} className="w-full text-xs font-mono bg-white border border-blue-200 rounded px-2 py-1.5" onFocus={(e) => e.currentTarget.select()} />
                  <button
                    type="button"
                    onClick={async () => { await navigator.clipboard.writeText(lastInviteLink); toast.success("Copied"); }}
                    className="text-xs bg-blue-500 hover:bg-blue-400 text-white font-medium px-3 py-1.5 rounded"
                  >Copy link</button>
                  <div className="text-[11px] text-blue-700">Send this link to <b>{inviteForm.email || "the invitee"}</b> — they'll set their own password.</div>
                </div>
              )}
              <F label="Email" type="email" value={inviteForm.email} onChange={(v) => setInviteForm({ ...inviteForm, email: v })} required />
              <F label="Full name (optional)" value={inviteForm.fullName} onChange={(v) => setInviteForm({ ...inviteForm, fullName: v })} />
              <div>
                <label className="text-xs font-medium block mb-1">Role</label>
                <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="reception">Reception</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Department (optional)</label>
                <select value={inviteForm.departmentId} onChange={(e) => setInviteForm({ ...inviteForm, departmentId: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowInvite(false); setLastInviteLink(null); }} className="px-4 py-2 text-sm">Close</button>
              <button type="submit" disabled={saving} className="bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
                {saving ? "Creating…" : "Generate invitation link"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Create staff account directly</h2>
                <p className="text-[11px] text-slate-500">Use only if you can share credentials in person</p>
              </div>
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

function F({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1">{label}{required && " *"}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}
