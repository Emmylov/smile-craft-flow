import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patients")({
  component: PatientsPage,
});

function PatientsPage() {
  const { hospital, role } = useKairos();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!hospital?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("patients")
        .select("*")
        .eq("hospital_id", hospital.id)
        .order("created_at", { ascending: false });
      setPatients(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`patients-${hospital.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `hospital_id=eq.${hospital.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hospital?.id]);

  const filtered = patients.filter((p) =>
    !search ||
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_code.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone ?? "").includes(search),
  );

  const canRegister = role === "nurse" || role === "reception" || role === "admin";

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} registered`}
        actions={
          canRegister && (
            <button
              onClick={() => setShowNew(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Register patient
            </button>
          )
        }
      />

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, patient code, or phone…"
          className="w-full max-w-md bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Patient ID</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">DOB</th>
              <th className="text-left px-4 py-3">Gender</th>
              <th className="text-left px-4 py-3">Phone</th>
              <th className="text-left px-4 py-3">Registered</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">No patients yet.</td></tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{p.patient_code}</td>
                <td className="px-4 py-3 font-medium">{p.full_name}</td>
                <td className="px-4 py-3">{p.date_of_birth ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{p.gender ?? "—"}</td>
                <td className="px-4 py-3">{p.phone ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link to="/patients/$id" params={{ id: p.id }} className="text-blue-600 hover:text-blue-500 text-xs font-medium">
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <RegisterPatientModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            navigate({ to: "/patients/$id", params: { id } });
          }}
        />
      )}
    </div>
  );
}

function RegisterPatientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { hospital, userId } = useKairos();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "female",
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    allergies: "",
    chronic_illnesses: "",
    medications: "",
    insurance_provider: "",
    insurance_number: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospital?.id) return;
    setSaving(true);
    const patient_code = `P-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase
      .from("patients")
      .insert({
        hospital_id: hospital.id,
        created_by: userId || null,
        patient_code,
        full_name: form.full_name,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        phone: form.phone || null,
        address: form.address || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        allergies: form.allergies || null,
        chronic_illnesses: form.chronic_illnesses || null,
        medications: form.medications || null,
        insurance_provider: form.insurance_provider || null,
        insurance_number: form.insurance_number || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Patient ${patient_code} registered`);
    await supabase.from("notifications").insert({
      hospital_id: hospital.id,
      type: "patient_registered",
      message: `New patient registered: ${form.full_name} (${patient_code})`,
    });
    onCreated(data.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Register new patient</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <F label="Full name" required value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <F label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
            <div>
              <label className="text-xs font-medium block mb-1">Gender</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <F label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <F label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <div className="grid grid-cols-2 gap-3">
            <F label="Emergency contact name" value={form.emergency_contact_name} onChange={(v) => setForm({ ...form, emergency_contact_name: v })} />
            <F label="Emergency contact phone" value={form.emergency_contact_phone} onChange={(v) => setForm({ ...form, emergency_contact_phone: v })} />
          </div>
          <F label="Allergies" value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} />
          <F label="Chronic illnesses" value={form.chronic_illnesses} onChange={(v) => setForm({ ...form, chronic_illnesses: v })} />
          <F label="Current medications" value={form.medications} onChange={(v) => setForm({ ...form, medications: v })} />
          <div className="grid grid-cols-2 gap-3">
            <F label="Insurance provider" value={form.insurance_provider} onChange={(v) => setForm({ ...form, insurance_provider: v })} />
            <F label="Insurance number" value={form.insurance_number} onChange={(v) => setForm({ ...form, insurance_number: v })} />
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.full_name}
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving…" : "Register patient"}
          </button>
        </div>
      </form>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1">{label}{required && " *"}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
