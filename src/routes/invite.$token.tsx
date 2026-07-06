import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { acceptStaffInvitation } from "@/lib/kairos.functions";
import { toast } from "sonner";
import kairosLogo from "@/assets/kairos-logo.png.asset.json";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  component: InvitePage,
});

type InvitationDetails = {
  invitation_id: string;
  hospital_id: string;
  hospital_name: string;
  email: string;
  full_name: string | null;
  role: string;
  department_name: string | null;
  expires_at: string;
  status: "pending" | "accepted" | "revoked" | "expired";
};

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const accept = useServerFn(acceptStaffInvitation);

  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<null | { email: string }>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("verify_invitation", { _token: token });
      if (error) toast.error(error.message);
      const row = Array.isArray(data) ? (data[0] as InvitationDetails | undefined) : (data as InvitationDetails | undefined);
      setDetails(row ?? null);
      if (row?.full_name) setFullName(row.full_name);
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) setSession({ email: userData.user.email ?? "" });
      setLoading(false);
    })();
  }, [token]);

  const finalize = async () => {
    setSubmitting(true);
    try {
      const res = await accept({ data: { token, fullName } });
      toast.success(`Welcome to ${res.hospitalName}`);
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not accept invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;
    setSubmitting(true);
    try {
      if (session) {
        // already signed in — go straight to accept
        if (session.email.toLowerCase() !== details.email.toLowerCase()) {
          throw new Error(`You're signed in as ${session.email}. Sign out and sign in as ${details.email}.`);
        }
        await finalize();
        return;
      }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: details.email, password });
        if (error) throw error;
        // If email confirmation is enabled, session may be null — try sign in
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          const { error: siErr } = await supabase.auth.signInWithPassword({ email: details.email, password });
          if (siErr) throw siErr;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: details.email, password });
        if (error) throw error;
      }
      await finalize();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={kairosLogo.url} alt="Kairos" className="w-14 h-14 mx-auto rounded-2xl shadow-lg shadow-blue-500/30" />
          <div className="text-xs uppercase tracking-[0.2em] text-blue-300 mt-4">Staff invitation</div>
        </div>

        <div className="bg-white/[0.05] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
          {loading ? (
            <div className="text-center text-slate-400 py-10">Verifying invitation…</div>
          ) : !details ? (
            <Empty title="Invitation not found" body="Ask your administrator to send a fresh invitation link." />
          ) : details.status === "revoked" ? (
            <Empty title="Invitation revoked" body="This invitation is no longer valid." />
          ) : details.status === "accepted" ? (
            <Empty title="Already accepted" body="You've already joined this workspace." action={{ label: "Go to dashboard", onClick: () => navigate({ to: "/dashboard" }) }} />
          ) : details.status === "expired" ? (
            <Empty title="Invitation expired" body={`This invitation expired on ${new Date(details.expires_at).toLocaleDateString()}. Ask for a new one.`} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Join {details.hospital_name}</h1>
                <p className="text-sm text-slate-300 mt-1">
                  You've been invited as <b className="text-white capitalize">{details.role}</b>
                  {details.department_name ? <> in <b className="text-white">{details.department_name}</b></> : null}.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Invited email</div>
                <div className="font-mono text-blue-200">{details.email}</div>
              </div>

              {!session && (
                <>
                  <div className="flex text-xs rounded-full bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className={`flex-1 py-1.5 rounded-full transition ${mode === "signup" ? "bg-blue-500 text-white" : "text-slate-300"}`}
                    >
                      Create account
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className={`flex-1 py-1.5 rounded-full transition ${mode === "signin" ? "bg-blue-500 text-white" : "text-slate-300"}`}
                    >
                      I have an account
                    </button>
                  </div>

                  {mode === "signup" && (
                    <div>
                      <label className="text-xs font-medium block mb-1.5 text-slate-300">Your full name</label>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium block mb-1.5 text-slate-300">Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                    />
                  </div>
                </>
              )}

              {session && (
                <div className="text-xs text-slate-400">
                  Signed in as <b className="text-slate-200">{session.email}</b>.
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
              >
                {submitting ? "Joining…" : `Accept & join ${details.hospital_name}`}
              </button>

              <p className="text-[11px] text-center text-slate-500">
                Expires {new Date(details.expires_at).toLocaleString()}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="text-center py-6">
      <div className="text-lg font-semibold mb-1">{title}</div>
      <p className="text-sm text-slate-400">{body}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-5 py-2 rounded-lg"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
