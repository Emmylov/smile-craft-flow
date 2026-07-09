import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos, type AppRole } from "@/hooks/use-kairos";
import { useInvitationNotifications } from "@/hooks/use-invitation-notifications";
import { useMentionNotifications } from "@/hooks/use-mention-notifications";
import kairosLogo from "@/assets/kairos-logo.png";

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

type NavItem = { to: string; label: string; icon: string; roles?: AppRole[] };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/queue", label: "Queue", icon: "groups" },
  { to: "/patients", label: "Patients", icon: "personal_injury" },
  { to: "/appointments", label: "Appointments", icon: "event" },
  { to: "/pharmacy", label: "Pharmacy", icon: "medication" },
  { to: "/laboratory", label: "Laboratory", icon: "science" },
  { to: "/chat", label: "Messages", icon: "chat" },
  { to: "/aura", label: "Aura", icon: "neurology" },
  { to: "/departments", label: "Departments", icon: "domain", roles: ["admin"] },
  { to: "/staff", label: "Staff", icon: "badge", roles: ["admin"] },
  { to: "/settings", label: "Settings", icon: "settings", roles: ["admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { hospital, profile, role, email, loading, userId } = useKairos();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useInvitationNotifications({
    hospitalId: hospital?.id ?? null,
    isAdmin: role === "admin",
    currentUserId: userId,
  });
  useMentionNotifications(userId);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const items = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <aside className="w-64 bg-slate-950 text-slate-100 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <img src={kairosLogo.url} alt="Kairos" className="w-9 h-9 rounded-lg object-cover" />
            <div>
              <div className="font-bold text-sm">Kairos Core</div>
              <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                {hospital?.name ?? "…"}
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon name={item.icon} className="text-[20px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="px-2 py-2 mb-2">
            <div className="text-sm font-medium truncate">{profile?.full_name ?? email}</div>
            <div className="text-[11px] text-slate-400 capitalize">{role ?? "—"}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              WS: {hospital?.workspace_id ?? "—"}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Icon name="logout" className="text-[18px]" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          {loading ? (
            <div className="flex min-h-[70vh] items-center justify-center text-slate-500">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                Loading workspace…
              </div>
            </div>
          ) : children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
