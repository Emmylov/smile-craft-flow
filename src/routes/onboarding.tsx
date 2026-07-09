import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createHospitalWorkspace } from "@/lib/kairos.functions";
import { toast } from "sonner";
import kairosLogo from "@/assets/kairos-logo.png";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const HOSPITAL_TYPES = ["General Hospital", "Teaching Hospital", "Specialist Clinic", "Community Clinic", "Diagnostic Center"];

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const CHAPTERS: { title: string; sub: string; guide: string }[] = [
  { title: "Welcome to Kairos", sub: "Let's set up your hospital's operating system", guide: "Hi, I'm Aura. I'll walk you through onboarding your hospital — it'll only take a few minutes." },
  { title: "Tell me about your hospital", sub: "Chapter 1 · Identity", guide: "Every hospital has a story. Let's start with the basics — the name, the type, and where you're located." },
  { title: "Departments that make you tick", sub: "Chapter 2 · Structure", guide: "We'll pre-load the departments most hospitals use. You can tune this later from Settings." },
  { title: "Who's in charge?", sub: "Chapter 3 · Administrator", guide: "Every workspace needs a captain. You'll be the first admin — you can invite the rest of your team from the dashboard." },
  { title: "Bringing it to life…", sub: "Chapter 4 · Launch", guide: "Beautiful. Give me a moment — I'm setting up your workspace, departments, and secure access keys." },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const createWorkspace = useServerFn(createHospitalWorkspace);
  const [step, setStep] = useState<Step>(0);
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

  // Auto-advance from welcome
  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 3600);
      return () => clearTimeout(t);
    }
  }, [step]);

  const submit = async () => {
    setStep(4);
    setLoading(true);
    try {
      const { data: signUp, error: sErr } = await supabase.auth.signUp({
        email: admin.email,
        password: admin.password,
      });
      if (sErr) throw new Error(sErr.message);
      if (!signUp.session) {
        const { error: siErr } = await supabase.auth.signInWithPassword({
          email: admin.email,
          password: admin.password,
        });
        if (siErr) throw new Error(siErr.message);
      }

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
      // Show the launch animation briefly before revealing credentials
      await new Promise((r) => setTimeout(r, 1200));
      setStep(5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Onboarding failed");
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const chapter = CHAPTERS[Math.min(step, 4) as 0 | 1 | 2 | 3 | 4];

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      {/* Cinematic background */}
      <div className="absolute inset-0 opacity-70">
        <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full bg-blue-600/30 blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-[-30%] right-[-10%] w-[70vw] h-[70vw] rounded-full bg-violet-600/30 blur-[120px] animate-pulse" style={{ animationDuration: "10s", animationDelay: "1s" }} />
        <div className="absolute top-[30%] right-[20%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/20 blur-[100px] animate-pulse" style={{ animationDuration: "12s", animationDelay: "2s" }} />
      </div>
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="px-6 md:px-10 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition">
            <img src={kairosLogo} alt="Kairos" className="w-8 h-8 rounded-lg" />
            <span className="text-sm font-semibold tracking-wide">KAIROS</span>
          </Link>
          {step > 0 && step < 5 && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className={`h-1 w-8 rounded-full transition-all ${step >= n ? "bg-blue-400" : "bg-white/10"}`} />
              ))}
              <span className="text-[11px] text-slate-400 ml-2">Chapter {Math.min(step, 4)} of 4</span>
            </div>
          )}
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-3xl">
            {/* Welcome */}
            {step === 0 && (
              <div className="text-center animate-[fadeUp_.8s_ease-out]">
                <img src={kairosLogo} alt="Kairos" className="w-24 h-24 mx-auto mb-8 rounded-2xl shadow-2xl shadow-blue-500/30 animate-[float_3s_ease-in-out_infinite]" />
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
                  Welcome to <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">Kairos</span>
                </h1>
                <p className="text-lg text-slate-300 max-w-xl mx-auto">
                  The operating system for modern healthcare. Let's build yours.
                </p>
                <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Starting your journey…
                </div>
              </div>
            )}

            {step > 0 && step < 5 && (
              <div className="animate-[fadeUp_.5s_ease-out]" key={step}>
                {/* Guide bubble */}
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-sm font-bold shrink-0 shadow-lg shadow-blue-500/30 animate-[float_3s_ease-in-out_infinite]">A</div>
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-300 mb-0.5">Aura · Your guide</div>
                    <p className="text-sm text-slate-100">{chapter.guide}</p>
                  </div>
                </div>

                <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                  <div className="mb-6">
                    <div className="text-xs uppercase tracking-wider text-blue-300">{chapter.sub}</div>
                    <h2 className="text-2xl font-bold mt-1">{chapter.title}</h2>
                  </div>

                  {step === 1 && (
                    <div className="space-y-4">
                      <Field label="Hospital name" value={hospital.name} onChange={(v) => setHospital({ ...hospital, name: v })} required />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium block mb-2">Hospital type</label>
                          <select
                            value={hospital.hospitalType}
                            onChange={(e) => setHospital({ ...hospital, hospitalType: e.target.value })}
                            className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-4 py-3 text-white"
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
                      <NavRow onBack={null} onNext={() => setStep(2)} nextDisabled={!hospital.name} />
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-300">
                        We'll pre-load these — the backbone of most hospital operations.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {["Emergency", "General Medicine", "Pediatrics", "Surgery", "Cardiology", "Radiology", "Pharmacy", "Laboratory"].map((d, i) => (
                          <div
                            key={d}
                            className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-3 text-sm animate-[fadeUp_.4s_ease-out] flex items-center gap-2"
                            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            {d}
                          </div>
                        ))}
                      </div>
                      <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} />
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <Field label="Full name" value={admin.fullName} onChange={(v) => setAdmin({ ...admin, fullName: v })} required />
                      <Field label="Email" type="email" value={admin.email} onChange={(v) => setAdmin({ ...admin, email: v })} required />
                      <Field label="Password" type="password" value={admin.password} onChange={(v) => setAdmin({ ...admin, password: v })} required />
                      <p className="text-xs text-slate-400">Use a strong password — you'll unlock the whole workspace with it.</p>
                      <NavRow
                        onBack={() => setStep(2)}
                        onNext={submit}
                        nextLabel="Create workspace"
                        nextDisabled={loading || !admin.fullName || !admin.email || !admin.password}
                      />
                    </div>
                  )}

                  {step === 4 && (
                    <div className="py-8 text-center">
                      <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-2 border-blue-400/30" />
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
                        <img src={kairosLogo} alt="" className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover" />
                      </div>
                      <div className="space-y-1 text-sm text-slate-300">
                        <LoadingLine text="Provisioning workspace" delay={0} />
                        <LoadingLine text="Preparing departments" delay={400} />
                        <LoadingLine text="Generating secure access keys" delay={900} />
                        <LoadingLine text="Signing you in" delay={1400} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 5 && result && (
              <div className="animate-[fadeUp_.6s_ease-out]">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-emerald-400/20 border-2 border-emerald-400/50 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-400/30">
                    <span className="material-symbols-outlined text-emerald-400 text-5xl">check</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-3">Welcome aboard.</h1>
                  <p className="text-slate-300">
                    <b>{result.hospitalName}</b> is live on Kairos.
                  </p>
                </div>

                <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 max-w-lg mx-auto">
                  <div className="text-xs uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">key</span>
                    Save these — you'll need them to sign in
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[11px] uppercase text-slate-400">Workspace ID</div>
                      <div className="font-mono text-2xl text-blue-300 mt-1">{result.workspaceId}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-slate-400">Access Key</div>
                      <div className="font-mono text-sm text-slate-200 break-all bg-slate-900/60 rounded-lg px-3 py-2 mt-1">{result.accessKey}</div>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-8">
                  <button
                    onClick={() => navigate({ to: "/dashboard" })}
                    className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white font-semibold px-8 py-3.5 rounded-xl shadow-2xl shadow-blue-500/30"
                  >
                    Enter Kairos →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
    </div>
  );
}

function LoadingLine({ text, delay }: { text: string; delay: number }) {
  return (
    <div
      className="flex items-center justify-center gap-2 opacity-0 animate-[fadeUp_.4s_ease-out_forwards]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="w-1 h-1 rounded-full bg-blue-400" />
      {text}…
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
}: {
  onBack: (() => void) | null;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? (
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm px-4 py-3">
          ← Back
        </button>
      ) : <span />}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20"
      >
        {nextLabel}
      </button>
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
        className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
      />
    </div>
  );
}
