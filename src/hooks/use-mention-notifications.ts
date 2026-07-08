import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function useMentionNotifications(userId: string | null | undefined) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`mentions-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { type?: string; message?: string; link?: string };
          if (row.type !== "mention") return;
          toast(row.message ?? "You were mentioned", {
            action: row.link
              ? { label: "Open", onClick: () => navigate({ to: row.link as string }) }
              : undefined,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, navigate]);
}
