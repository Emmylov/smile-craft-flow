import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { mapPatientToFhir } from "@/lib/fhir";

export const Route = createFileRoute("/api/fhir/Patient/:id")({
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

          const { data: patient, error: pErr } = await supabase.from("patients").select("*, hospitals: hospitals(id,workspace_id)").eq("id", id).maybeSingle();
          if (pErr) return new Response(pErr.message, { status: 500 });
          if (!patient) return new Response("Patient not found", { status: 404 });

          const fhir = mapPatientToFhir(patient, patient.hospitals ?? undefined);
          return new Response(JSON.stringify(fhir), { status: 200, headers: { "Content-Type": "application/fhir+json; charset=utf-8" } });
        } catch (err: any) {
          return new Response(err?.message ?? String(err), { status: 500 });
        }
      },
    },
  },
});
