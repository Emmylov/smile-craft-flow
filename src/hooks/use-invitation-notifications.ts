import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type EventRow = {
  id: string;
  hospital_id: string;
  invitation_id: string;
  event: "created" | "revoked" | "accepted" | "resent";
  email: string | null;
  role: string | null;
  actor_id: string | null;
  created_at: string;
};

/**
 * Subscribes admins to the invitation activity log and surfaces
 * live toasts as invitations are accepted/revoked/resent.
 * `expired` and cross-hospital rejections have no DB event row —
 * accept_invitation raises in-place and we surface those via the
 * invite page toast, plus a periodic sweep here for freshly-expired.
 */
export function useInvitationNotifications(opts: {
  hospitalId: string | null | undefined;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const { hospitalId, isAdmin, currentUserId } = opts;

  useEffect(() => {
    if (!hospitalId || !isAdmin) return;

    const seen = new Date().toISOString();
    const channel = supabase
      .channel(`invite-events-${hospitalId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "staff_invitation_events",
          filter: `hospital_id=eq.${hospitalId}`,
        },
        (payload) => {
          const row = payload.new as EventRow;
          // suppress toast for the admin's own actions to avoid double-feedback
          if (row.actor_id && row.actor_id === currentUserId) return;
          if (new Date(row.created_at) < new Date(seen)) return;

          const who = row.email ?? "someone";
          const rolePart = row.role ? ` (${row.role})` : "";
          switch (row.event) {
            case "accepted":
              toast.success(`${who}${rolePart} accepted their invitation`);
              break;
            case "revoked":
              toast(`Invitation for ${who} was revoked`);
              break;
            case "resent":
              toast(`Invitation for ${who} was resent`);
              break;
            case "created":
              toast(`Invitation sent to ${who}${rolePart}`);
              break;
          }
        },
      )
      .subscribe();

    // Sweep every 60s for freshly-expired invitations (no trigger event exists)
    let lastExpiredCheck = new Date().toISOString();
    const sweep = window.setInterval(async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("staff_invitations")
        .select("email, role, expires_at")
        .eq("hospital_id", hospitalId)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .lt("expires_at", nowIso)
        .gte("expires_at", lastExpiredCheck);
      (data ?? []).forEach((i) => {
        toast(`Invitation for ${i.email} expired`, {
          description: "Send a new one from Staff → Invitations.",
        });
      });
      lastExpiredCheck = nowIso;
    }, 60_000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(sweep);
    };
  }, [hospitalId, isAdmin, currentUserId]);
}
