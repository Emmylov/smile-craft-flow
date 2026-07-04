import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { hospital, role } = useKairos();
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (!hospital?.id) return;
    supabase.from("hospitals").select("*").eq("id", hospital.id).single().then(({ data }) => setForm(data));
  }, [hospital?.id]);

  if (role !== "admin") return <div className="text-slate-500">Admins only.</div>;
  if (!form) return <div>Loading…</div>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("hospitals").update({
      name: form.name, email: form.email, phone: form.phone,
      address: form.address, city: form.city, state: form.state,
      country: form.country, hospital_type: form.hospital_type,
    }).eq("id", form.id);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  return (
    <div>
      <PageHeader title="Hospital settings" />
      <div className="bg-slate-900 text-white rounded-xl p-5 mb-6 max-w-2xl">
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Workspace credentials</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-slate-400">Workspace ID</div>
            <div className="font-mono text-blue-300">{form.workspace_id}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Access Key</div>
            <div className="font-mono text-xs break-all">{form.access_key}</div>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="bg-white rounded-xl border border-slate-200 p-5 max-w-2xl space-y-3">
        <F label="Hospital name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <F label="Type" value={form.hospital_type ?? ""} onChange={(v) => setForm({ ...form, hospital_type: v })} />
        <div className="grid grid-cols-2 gap-3">
          <F label="Email" value={form.email ?? ""} onChange={(v) => setForm({ ...form, email: v })} />
          <F label="Phone" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} />
        </div>
        <F label="Address" value={form.address ?? ""} onChange={(v) => setForm({ ...form, address: v })} />
        <div className="grid grid-cols-3 gap-3">
          <F label="City" value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} />
          <F label="State" value={form.state ?? ""} onChange={(v) => setForm({ ...form, state: v })} />
          <F label="Country" value={form.country ?? ""} onChange={(v) => setForm({ ...form, country: v })} />
        </div>
        <button className="bg-slate-900 text-white text-sm font-semibold px-5 py-2 rounded-lg">Save</button>
      </form>
    </div>
  );
}

function F({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}
