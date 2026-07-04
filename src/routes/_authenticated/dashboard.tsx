import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { hospital, profile, role } = useKairos();
  const [stats, setStats] = useState({
    patients: 0,
    queueWaiting: 0,
    queueInConsult: 0,
    appointmentsToday: 0,
    staff: 0,
    departments: 0,
  });
  const [recentQueue, setRecentQueue] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!hospital?.id) return;
    const load = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const [p, qw, qi, apt, st, dp, rq, notif] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("queue_entries").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).in("status", ["waiting", "checked_in"]),
        supabase.from("queue_entries").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).eq("status", "in_consultation"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).gte("scheduled_at", todayIso),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("departments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("queue_entries").select("id, status, urgency, checked_in_at, patients(full_name, patient_code)").eq("hospital_id", hospital.id).order("checked_in_at", { ascending: false }).limit(6),
        supabase.from("notifications").select("*").eq("hospital_id", hospital.id).order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        patients: p.count ?? 0,
        queueWaiting: qw.count ?? 0,
        queueInConsult: qi.count ?? 0,
        appointmentsToday: apt.count ?? 0,
        staff: st.count ?? 0,
        departments: dp.count ?? 0,
      });
      setRecentQueue(rq.data ?? []);
      setNotifications(notif.data ?? []);
    };
    load();

    const ch = supabase
      .channel(`dash-${hospital.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries", filter: `hospital_id=eq.${hospital.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `hospital_id=eq.${hospital.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `hospital_id=eq.${hospital.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [hospital?.id]);

  if (!hospital) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">No hospital workspace linked to your account.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? "there"}`}
        subtitle={`${hospital.name} · ${role ?? "member"} view`}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Stat label="Patients" value={stats.patients} icon="personal_injury" />
        <Stat label="Waiting" value={stats.queueWaiting} icon="hourglass_empty" color="amber" />
        <Stat label="In consult" value={stats.queueInConsult} icon="stethoscope" color="blue" />
        <Stat label="Today's appts" value={stats.appointmentsToday} icon="event" />
        <Stat label="Staff" value={stats.staff} icon="badge" />
        <Stat label="Departments" value={stats.departments} icon="domain" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Live queue</h3>
            <Link to="/queue" className="text-xs text-blue-600 hover:text-blue-500">View all →</Link>
          </div>
          {recentQueue.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No patients in the queue yet.</p>
          ) : (
            <div className="space-y-2">
              {recentQueue.map((q) => (
                <div key={q.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="text-sm font-medium">{q.patients?.full_name ?? "—"}</div>
                    <div className="text-xs text-slate-500">{q.patients?.patient_code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UrgencyBadge urgency={q.urgency} />
                    <StatusBadge status={q.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold mb-4">Notifications</h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">All caught up.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="text-sm">
                  <div className="text-slate-800">{n.message}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(n.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-slate-900 text-white rounded-xl p-6">
        <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Workspace</div>
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-[11px] text-slate-400">Workspace ID</div>
            <div className="font-mono">{hospital.workspace_id}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Hospital</div>
            <div>{hospital.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: number; icon: string; color?: string }) {
  const bg = color === "amber" ? "bg-amber-50 text-amber-700" : color === "blue" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700";
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${bg}`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    routine: "bg-slate-100 text-slate-700",
    urgent: "bg-amber-100 text-amber-700",
    critical: "bg-red-100 text-red-700",
  };
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${map[urgency] ?? map.routine}`}>{urgency}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    checked_in: "bg-slate-100 text-slate-700",
    waiting: "bg-amber-100 text-amber-700",
    called: "bg-purple-100 text-purple-700",
    in_consultation: "bg-blue-100 text-blue-700",
    laboratory: "bg-cyan-100 text-cyan-700",
    pharmacy: "bg-emerald-100 text-emerald-700",
    completed: "bg-green-100 text-green-700",
  };
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${map[status] ?? map.checked_in}`}>{status.replace(/_/g, " ")}</span>;
}
