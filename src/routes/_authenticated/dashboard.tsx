import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { AuraAssistantPanel } from "@/components/aura-assistant-panel";

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
  const [analytics, setAnalytics] = useState({
    throughputToday: 0,
    avgWaitRoutine: 0,
    avgWaitUrgent: 0,
    avgWaitCritical: 0,
    rxPending: 0,
    rxReady: 0,
    labPending: 0,
    labInProgress: 0,
  });
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [recentQueue, setRecentQueue] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!hospital?.id) return;
    const load = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

      const [p, qw, qi, apt, st, dp, rq, notif, allTodayQueue, rxAll, labAll, cliniciansData] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("queue_entries").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).in("status", ["waiting", "checked_in"]),
        supabase.from("queue_entries").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).eq("status", "in_consultation"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id).gte("scheduled_at", todayIso),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("departments").select("id", { count: "exact", head: true }).eq("hospital_id", hospital.id),
        supabase.from("queue_entries").select("id, status, urgency, checked_in_at, patients(full_name, patient_code)").eq("hospital_id", hospital.id).order("checked_in_at", { ascending: false }).limit(6),
        supabase.from("notifications").select("*").eq("hospital_id", hospital.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("queue_entries").select("urgency, status, checked_in_at, completed_at, assigned_doctor").eq("hospital_id", hospital.id).gte("checked_in_at", todayIso),
        supabase.from("prescriptions").select("status").eq("hospital_id", hospital.id),
        supabase.from("lab_orders").select("status").eq("hospital_id", hospital.id),
        supabase.from("profiles").select("id, user_id, full_name").eq("hospital_id", hospital.id),
      ]);

      // Analytics computed client-side
      const finished = (allTodayQueue.data ?? []).filter((q: any) => q.status === "completed" && q.completed_at);
      const waitOf = (q: any) => (new Date(q.completed_at!).getTime() - new Date(q.checked_in_at).getTime()) / 60000;
      const avgFor = (u: string) => {
        const arr = finished.filter((q: any) => q.urgency === u).map(waitOf);
        return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      };

      const rxCounts = (rxAll.data ?? []).reduce((acc: any, r: any) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {});
      const labCounts = (labAll.data ?? []).reduce((acc: any, r: any) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {});

      // Clinician activity (consultations today)
      const { data: consultsToday } = await supabase
        .from("consultations")
        .select("doctor_id")
        .eq("hospital_id", hospital.id)
        .gte("created_at", todayIso);
      const byDoctor: Record<string, number> = {};
      (consultsToday ?? []).forEach((c: any) => {
        if (c.doctor_id) byDoctor[c.doctor_id] = (byDoctor[c.doctor_id] || 0) + 1;
      });
      const clinicianRows = (cliniciansData.data ?? [])
        .map((s: any) => ({ ...s, consults: byDoctor[s.user_id] || 0 }))
        .filter((s: any) => s.consults > 0)
        .sort((a: any, b: any) => b.consults - a.consults)
        .slice(0, 6);

      setStats({
        patients: p.count ?? 0,
        queueWaiting: qw.count ?? 0,
        queueInConsult: qi.count ?? 0,
        appointmentsToday: apt.count ?? 0,
        staff: st.count ?? 0,
        departments: dp.count ?? 0,
      });
      setAnalytics({
        throughputToday: finished.length,
        avgWaitRoutine: avgFor("routine"),
        avgWaitUrgent: avgFor("urgent"),
        avgWaitCritical: avgFor("critical"),
        rxPending: (rxCounts.pending || 0) + (rxCounts.preparing || 0),
        rxReady: rxCounts.ready || 0,
        labPending: labCounts.ordered || 0,
        labInProgress: labCounts.in_progress || 0,
      });
      setClinicians(clinicianRows);
      setRecentQueue(rq.data ?? []);
        setNotifications(notif.data ?? []);
      } catch (error) {
        console.error("Failed to load dashboard", error);
      }
    };
    load();

    const ch = supabase
      .channel(`dash-${hospital.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries", filter: `hospital_id=eq.${hospital.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `hospital_id=eq.${hospital.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `hospital_id=eq.${hospital.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "consultations", filter: `hospital_id=eq.${hospital.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions", filter: `hospital_id=eq.${hospital.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_orders", filter: `hospital_id=eq.${hospital.id}` }, load)
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

  const isAdmin = role === "admin";

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? "there"}`}
        subtitle={`${hospital.name} · ${role ?? "member"} view`}
      />

      <div className="mb-6">
        <AuraAssistantPanel />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Stat label="Patients" value={stats.patients} icon="personal_injury" />
        <Stat label="Waiting" value={stats.queueWaiting} icon="hourglass_empty" color="amber" />
        <Stat label="In consult" value={stats.queueInConsult} icon="stethoscope" color="blue" />
        <Stat label="Today's appts" value={stats.appointmentsToday} icon="event" />
        <Stat label="Staff" value={stats.staff} icon="badge" />
        <Stat label="Departments" value={stats.departments} icon="domain" />
      </div>

      {isAdmin && (
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 font-semibold">Live analytics</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <AnalyticsCard title="Queue throughput" subtitle="Completed today">
              <div className="text-4xl font-bold">{analytics.throughputToday}</div>
              <div className="text-xs text-slate-500 mt-1">patients seen so far today</div>
            </AnalyticsCard>
            <AnalyticsCard title="Avg wait by urgency" subtitle="Minutes, today">
              <WaitBar label="Critical" value={analytics.avgWaitCritical} color="bg-red-500" />
              <WaitBar label="Urgent" value={analytics.avgWaitUrgent} color="bg-amber-500" />
              <WaitBar label="Routine" value={analytics.avgWaitRoutine} color="bg-slate-400" />
            </AnalyticsCard>
            <AnalyticsCard title="Pipeline" subtitle="Prescriptions & labs open">
              <PipelineRow label="Rx pending / preparing" value={analytics.rxPending} tone="amber" />
              <PipelineRow label="Rx ready for collection" value={analytics.rxReady} tone="blue" />
              <PipelineRow label="Labs to start" value={analytics.labPending} tone="slate" />
              <PipelineRow label="Labs in progress" value={analytics.labInProgress} tone="amber" />
            </AnalyticsCard>
          </div>
          <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold mb-3">Clinician activity today</h3>
            {clinicians.length === 0 ? (
              <p className="text-sm text-slate-500">No consultations logged yet today.</p>
            ) : (
              <div className="space-y-2">
                {clinicians.map((c) => {
                  const max = clinicians[0].consults;
                  return (
                    <div key={c.user_id} className="flex items-center gap-3">
                      <div className="text-sm w-40 truncate">{c.full_name}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${(c.consults / max) * 100}%` }} />
                      </div>
                      <div className="text-xs font-semibold text-slate-700 w-14 text-right">{c.consults} consults</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

function AnalyticsCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-[11px] text-slate-500 mb-3">{subtitle}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function WaitBar({ label, value, color }: { label: string; value: number; color: string }) {
  const width = Math.min(value, 120);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold">{value ? `${value} min` : "—"}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`${color} h-full`} style={{ width: `${(width / 120) * 100}%` }} />
      </div>
    </div>
  );
}

function PipelineRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  const dot = tone === "amber" ? "bg-amber-500" : tone === "blue" ? "bg-blue-500" : "bg-slate-400";
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="flex items-center gap-2 text-slate-600"><span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{label}</span>
      <span className="font-semibold">{value}</span>
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
