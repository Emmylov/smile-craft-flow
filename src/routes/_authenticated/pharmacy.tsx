import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pharmacy")({
  component: PharmacyPage,
});

const FLOW = ["pending", "preparing", "ready", "collected"] as const;
type Status = (typeof FLOW)[number];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-blue-100 text-blue-700",
  collected: "bg-emerald-100 text-emerald-700",
};

function PharmacyPage() {
  const { hospital } = useKairos();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");

  const load = async () => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("prescriptions")
      .select("*, patients(full_name, patient_code)")
      .eq("hospital_id", hospital.id)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    if (!hospital?.id) return;
    const ch = supabase
      .channel(`pharm-${hospital.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prescriptions", filter: `hospital_id=eq.${hospital.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital?.id]);

  const advance = async (r: any) => {
    const i = FLOW.indexOf(r.status);
    const next: Status = FLOW[Math.min(i + 1, FLOW.length - 1)];
    const patch: any = { status: next };
    if (next === "ready") patch.ready_at = new Date().toISOString();
    if (next === "collected") patch.collected_at = new Date().toISOString();
    const { error } = await supabase.from("prescriptions").update(patch).eq("id", r.id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      hospital_id: hospital!.id,
      type: "prescription_status",
      message: `Prescription for ${r.patients?.full_name} is ${next}`,
    });
  };

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div>
      <PageHeader
        title="Pharmacy"
        subtitle="Prepare and dispense prescriptions to patients"
      />
      <div className="flex gap-2 mb-4">
        {(["all", ...FLOW] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`text-xs px-3 py-1.5 rounded-full ${filter === f ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Patient</th>
              <th className="text-left px-4 py-3">Medication</th>
              <th className="text-left px-4 py-3">Dosage</th>
              <th className="text-left px-4 py-3">Ordered</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No prescriptions.</td></tr>
            )}
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.patients?.full_name}</div>
                  <div className="text-xs text-slate-500">{r.patients?.patient_code}</div>
                </td>
                <td className="px-4 py-3">{r.medication}</td>
                <td className="px-4 py-3 text-slate-600">{r.dosage || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? STATUS_STYLE.pending}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status !== "collected" && (
                    <button onClick={() => advance(r)} className="text-xs bg-blue-500 hover:bg-blue-400 text-white font-semibold px-3 py-1.5 rounded-lg">
                      Mark {FLOW[FLOW.indexOf(r.status) + 1]}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
