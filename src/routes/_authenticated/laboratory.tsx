import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/laboratory")({
  component: LaboratoryPage,
});

const FLOW = ["ordered", "in_progress", "completed"] as const;
type Status = (typeof FLOW)[number];

const STATUS_STYLE: Record<string, string> = {
  ordered: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
};

function LaboratoryPage() {
  const { hospital } = useKairos();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);

  const load = async () => {
    if (!hospital?.id) return;
    const { data } = await supabase
      .from("lab_orders")
      .select("*, patients(full_name, patient_code)")
      .eq("hospital_id", hospital.id)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    if (!hospital?.id) return;
    const ch = supabase
      .channel(`lab-${hospital.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lab_orders", filter: `hospital_id=eq.${hospital.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital?.id]);

  const start = async (r: any) => {
    const { error } = await supabase
      .from("lab_orders")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", r.id);
    if (error) toast.error(error.message);
  };

  const complete = async (r: any) => {
    const notes = notesById[r.id] ?? r.results ?? "";
    const { error } = await supabase
      .from("lab_orders")
      .update({ status: "completed", completed_at: new Date().toISOString(), results: notes || null })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      hospital_id: hospital!.id,
      type: "lab_completed",
      message: `Lab result ready for ${r.patients?.full_name}: ${r.test_name}`,
    });
  };

  const onUpload = async (file: File | null) => {
    if (!file || !pendingUploadId || !hospital?.id) return;
    setUploadingId(pendingUploadId);
    const path = `${hospital.id}/${pendingUploadId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("lab-results").upload(path, file, { upsert: true });
    if (upErr) {
      setUploadingId(null);
      return toast.error(upErr.message);
    }
    const { data: signed } = await supabase.storage.from("lab-results").createSignedUrl(path, 60 * 60 * 24 * 7);
    const url = signed?.signedUrl ?? path;
    const { error } = await supabase
      .from("lab_orders")
      .update({ result_url: url, status: "completed", completed_at: new Date().toISOString() })
      .eq("id", pendingUploadId);
    setUploadingId(null);
    setPendingUploadId(null);
    if (error) return toast.error(error.message);
    toast.success("Result uploaded");
  };

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div>
      <PageHeader title="Laboratory" subtitle="Track lab orders, log progress, and upload results to patient records" />
      <div className="flex gap-2 mb-4">
        {(["all", ...FLOW] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`text-xs px-3 py-1.5 rounded-full ${filter === f ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"}`}
          >
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
      />
      <div className="space-y-3">
        {visible.length === 0 && <div className="text-sm text-slate-500 py-8 text-center">No lab orders.</div>}
        {visible.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">{r.test_name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {r.patients?.full_name} · {r.patients?.patient_code} · ordered {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full h-fit ${STATUS_STYLE[r.status] ?? STATUS_STYLE.ordered}`}>
                {r.status.replace(/_/g, " ")}
              </span>
            </div>

            {r.status === "completed" && (
              <div className="mt-3 text-sm">
                {r.results && <div className="bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{r.results}</div>}
                {r.result_url && (
                  <a href={r.result_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-500 inline-flex items-center gap-1 mt-2">
                    <span className="material-symbols-outlined text-[14px]">description</span>
                    View uploaded result
                  </a>
                )}
              </div>
            )}

            {r.status !== "completed" && (
              <div className="mt-3 space-y-2">
                {r.status === "in_progress" && (
                  <textarea
                    placeholder="Result notes (optional)"
                    value={notesById[r.id] ?? ""}
                    onChange={(e) => setNotesById({ ...notesById, [r.id]: e.target.value })}
                    rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                )}
                <div className="flex gap-2">
                  {r.status === "ordered" && (
                    <button onClick={() => start(r)} className="text-xs bg-amber-500 hover:bg-amber-400 text-white font-semibold px-3 py-1.5 rounded-lg">
                      Start test
                    </button>
                  )}
                  {r.status === "in_progress" && (
                    <button onClick={() => complete(r)} className="text-xs bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-3 py-1.5 rounded-lg">
                      Complete with notes
                    </button>
                  )}
                  <button
                    onClick={() => { setPendingUploadId(r.id); fileRef.current?.click(); }}
                    disabled={uploadingId === r.id}
                    className="text-xs border border-slate-200 hover:bg-slate-50 font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">upload</span>
                    {uploadingId === r.id ? "Uploading…" : "Upload result file"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
