import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface KairosContext {
  userId: string;
  email: string | null;
  profile: {
    id: string;
    full_name: string;
    hospital_id: string;
    department_id: string | null;
  } | null;
  hospital: {
    id: string;
    name: string;
    workspace_id: string;
  } | null;
  role: AppRole | null;
  loading: boolean;
}

export function useKairos(): KairosContext & { refresh: () => Promise<void> } {
  const [state, setState] = useState<KairosContext>({
    userId: "",
    email: null,
    profile: null,
    hospital: null,
    role: null,
    loading: true,
  });

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, hospital_id, department_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let hospital = null;
    let role: AppRole | null = null;
    if (profile?.hospital_id) {
      const { data: h } = await supabase
        .from("hospitals")
        .select("id, name, workspace_id")
        .eq("id", profile.hospital_id)
        .maybeSingle();
      hospital = h ?? null;

      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("hospital_id", profile.hospital_id)
        .maybeSingle();
      role = (r?.role as AppRole) ?? null;
    }

    setState({
      userId: user.id,
      email: user.email ?? null,
      profile: profile ?? null,
      hospital,
      role,
      loading: false,
    });
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, refresh: load };
}
