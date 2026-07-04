import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"workspace" | "credentials">("workspace");
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspace, setWorkspace] = useState<{ hospital_id: string; hospital_name: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.rpc("verify_workspace", {
      _workspace_id: workspaceId.trim(),
    });
    setLoading(false);
    if (error || !data || data.length === 0) {
      toast.error("Workspace not found. Check the ID and try again.");
      return;
    }
    setWorkspace(data[0]);
    setStep("credentials");
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message || "Invalid credentials");
      return;
    }
    // Verify user belongs to this workspace
    const { data: profile } = await supabase
      .from("profiles")
      .select("hospital_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!profile || profile.hospital_id !== workspace?.hospital_id) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("This account does not belong to that workspace.");
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="text-slate-400 hover:text-white text-sm mb-6 inline-block">
          ← Back
        </Link>
        <div className="bg-slate-900 rounded-2xl p-8 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center font-bold">
              K
            </div>
            <div>
              <div className="font-bold">Kairos Core</div>
              <div className="text-xs text-slate-400">Hospital workspace login</div>
            </div>
          </div>

          {step === "workspace" && (
            <form onSubmit={verifyWorkspace} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Workspace ID</label>
                <input
                  autoFocus
                  required
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value.toUpperCase())}
                  placeholder="KRS-XXXXXX"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  The unique ID for your hospital's Kairos workspace.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Continue"}
              </button>
              <div className="text-center text-sm text-slate-400 pt-2">
                No workspace yet?{" "}
                <Link to="/onboarding" className="text-blue-400 hover:text-blue-300">
                  Onboard your hospital
                </Link>
              </div>
            </form>
          )}

          {step === "credentials" && workspace && (
            <form onSubmit={signIn} className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-3 border border-white/5">
                <div className="text-xs text-slate-400">Workspace</div>
                <div className="font-semibold">{workspace.hospital_name}</div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("workspace");
                    setWorkspace(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                >
                  Change workspace
                </button>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
