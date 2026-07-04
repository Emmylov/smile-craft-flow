import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/departments")({
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { hospital, role } = useKairos();
  const [deps, setDeps] = useState<any[]>([]);
  const [name, setName] = useState("");

  const load = async () => {
    if (!hospital?.id) return;
    const { data } = await supabase.from("departments").select("*").eq("hospital_id", hospital.id).order("name");
    setDeps(data ?? []);
  };

  useEffect(() => { load(); }, [hospital?.id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital?.id || !name) return;
    const { error } = await supabase.from("departments").insert({ hospital_id: hospital.id, name });
    if (error) return toast.error(error.message);
    setName("");
    toast.success("Department added");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (role !== "admin") return <div className="text-slate-500">Admins only.</div>;

  return (
    <div>
      <PageHeader title="Departments" subtitle={`${deps.length} configured`} />
      <form onSubmit={add} className="flex gap-2 mb-6 max-w-md">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New department name" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
        <button type="submit" className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg">Add</button>
      </form>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {deps.map((d) => (
          <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{d.name}</div>
              <div className="text-xs text-slate-500">Added {new Date(d.created_at).toLocaleDateString()}</div>
            </div>
            <button onClick={() => remove(d.id)} className="text-slate-400 hover:text-red-500">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
