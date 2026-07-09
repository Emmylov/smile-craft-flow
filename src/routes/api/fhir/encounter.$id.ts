import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { mapConsultationToEncounter } from "@/lib/fhir";

export const Route = createFileRoute("/api/fhir/encounter/$id")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const segments = url.pathname.split("/").filter(Boolean);
          const id = segments[segments.length - 1];

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return new Response("Server configuration missing", { status: 500 });

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });

          const { data: consultation, error: cErr } = await supabase.from("consultations").select("*").eq("id", id).maybeSingle();
          if (cErr) return new Response(cErr.message, { status: 500 });
          if (!consultation) return new Response("Encounter (consultation) not found", { status: 404 });

          const fhir = mapConsultationToEncounter(consultation);
          return new Response(JSON.stringify(fhir), { status: 200, headers: { "Content-Type": "application/fhir+json; charset=utf-8" } });
        } catch (err: any) {
          return new Response(err?.message ?? String(err), { status: 500 });
        }
      },
    },
  },
});
