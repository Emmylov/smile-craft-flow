import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createHospitalWorkspace } from "@/lib/kairos.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const HOSPITAL_TYPES = ["General Hospital", "Teaching Hospital", "Specialist Clinic", "Community Clinic", "Diagnostic Center"];

function OnboardingPage() {
  const navigate = useNavigate();
  const createWorkspace = useServerFn(createHospitalWorkspace);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ workspaceId: string; accessKey: string; hospitalName: string } | null>(null);

  const [hospital, setHospital] = useState({
    name: "",
    hospitalType: "General Hospital",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
  });
  const [admin, setAdmin] = useState({ fullName: "", email: "", password: "" });

  const submit = async () => {
    setLoading(true);
    try {
      // 1. Create auth user
      const { data: signUp, error: sErr } = await supabase.auth.signUp({
        email: admin.email,
        password: admin.password,
      });
      if (sErr) throw new Error(sErr.message);
      if (!signUp.session) {
        // If auto-confirm didn't produce a session, sign in directly.
        const { error: siErr } = await supabase.auth.signInWithPassword({
          email: admin.email,
          password: admin.password,
        });
        if (siErr) throw new Error(siErr.message);
      }

      // 2. Create hospital via server function (uses auth'd user)
      const res = await createWorkspace({
        data: {
          hospitalName: hospital.name,
          email: hospital.email || admin.email,
          phone: hospital.phone,
          address: hospital.address,
          city: hospital.city,
          state: hospital.state,
          country: hospital.country,
          hospitalType: hospital.hospitalType,
          adminFullName: admin.fullName,
        },
      });
      setResult(res);
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">
          ← Back to Kairos
        </Link>

        <div className="bg-slate-900 rounded-2xl p-8 border border-white/10 shadow-2xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center font-bold">K</div>
              <div>
                <div className="font-bold">Onboard your hospital</div>
                <div className="text-xs text-slate-400">Step {step === 4 ? "Done" : `${step} of 3`}</div>
              </div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map((n) => (
                <div key={n} className={`h-1 flex-1 rounded-full ${step >= n ? "bg-blue-500" : "bg-white/10"}`} />
              ))}
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Hospital information</h2>
              <Field label="Hospital name" value={hospital.name} onChange={(v) => setHospital({ ...hospital, name: v })} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-2">Hospital type</label>
                  <select
                    value={hospital.hospitalType}
                    onChange={(e) => setHospital({ ...hospital, hospitalType: e.target.value })}
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white"
                  >
                    {HOSPITAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <Field label="Phone" value={hospital.phone} onChange={(v) => setHospital({ ...hospital, phone: v })} />
              </div>
              <Field label="Hospital email" type="email" value={hospital.email} onChange={(v) => setHospital({ ...hospital, email: v })} />
              <Field label="Address" value={hospital.address} onChange={(v) => setHospital({ ...hospital, address: v })} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="City" value={hospital.city} onChange={(v) => setHospital({ ...hospital, city: v })} />
                <Field label="State" value={hospital.state} onChange={(v) => setHospital({ ...hospital, state: v })} />
                <Field label="Country" value={hospital.country} onChange={(v) => setHospital({ ...hospital, country: v })} />
              </div>
              <div className="flex justify-end pt-4">
                <button
                  disabled={!hospital.name}
                  onClick={() => setStep(2)}
                  className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Departments</h2>
              <p className="text-sm text-slate-400">
                We'll pre-load your hospital with these standard departments. You can add or remove more later.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {["Emergency", "General Medicine", "Pediatrics", "Surgery", "Cardiology", "Radiology", "Pharmacy", "Laboratory"].map((d) => (
                  <div key={d} className="bg-slate-800 border border-white/5 rounded-lg px-3 py-2 text-sm">{d}</div>
                ))}
              </div>
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white px-4 py-3">Back</button>
                <button onClick={() => setStep(3)} className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3 rounded-lg">
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Administrator account</h2>
              <p className="text-sm text-slate-400">This will be the first user of the workspace, with full admin access.</p>
              <Field label="Full name" value={admin.fullName} onChange={(v) => setAdmin({ ...admin, fullName: v })} required />
              <Field label="Email" type="email" value={admin.email} onChange={(v) => setAdmin({ ...admin, email: v })} required />
              <Field label="Password" type="password" value={admin.password} onChange={(v) => setAdmin({ ...admin, password: v })} required />
              <div className="flex justify-between pt-4">
                <button onClick={() => setStep(2)} className="text-slate-400 hover:text-white px-4 py-3">Back</button>
                <button
                  onClick={submit}
                  disabled={loading || !admin.fullName || !admin.email || !admin.password}
                  className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg"
                >
                  {loading ? "Creating workspace…" : "Create workspace"}
                </button>
              </div>
            </div>
          )}

          {step === 4 && result && (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
              </div>
              <h2 className="text-xl font-semibold text-center">Workspace created</h2>
              <p className="text-sm text-slate-400 text-center">
                Save these credentials. You'll need the Workspace ID every time you sign in.
              </p>
              <div className="bg-slate-800 rounded-lg p-5 space-y-3 border border-white/5">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Hospital</div>
                  <div className="font-semibold">{result.hospitalName}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Workspace ID</div>
                  <div className="font-mono text-lg text-blue-300">{result.workspaceId}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Access Key</div>
                  <div className="font-mono text-sm text-slate-300 break-all">{result.accessKey}</div>
                </div>
              </div>
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3 rounded-lg"
              >
                Enter dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
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
      <label className="text-sm font-medium block mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
