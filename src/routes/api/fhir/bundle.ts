import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { mapPatientToFhir, mapConsultationToEncounter, mapLabOrderToObservation, mapVitalsToObservation } from "@/lib/fhir";

export const Route = createFileRoute("/api/fhir/Bundle")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const patientId = url.searchParams.get("patient");
          if (!patientId) return new Response("patient query parameter is required", { status: 400 });

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return new Response("Server configuration missing", { status: 500 });

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });

          const { data: patient, error: pErr } = await supabase.from("patients").select("*").eq("id", patientId).maybeSingle();
          if (pErr) return new Response(pErr.message, { status: 500 });
          if (!patient) return new Response("Patient not found", { status: 404 });

          const { data: consultations } = await supabase.from("consultations").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(50);
          const { data: labOrders } = await supabase.from("lab_orders").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(200);
          const { data: vitals } = await supabase.from("vitals").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(200);

          const entries: any[] = [];

          // Patient entry
          entries.push({ resource: mapPatientToFhir(patient) });

          // Encounters
          if (consultations) {
            for (const c of consultations) entries.push({ resource: mapConsultationToEncounter(c) });
          }

          // Observations from lab orders
          if (labOrders) {
            for (const l of labOrders) entries.push({ resource: mapLabOrderToObservation(l) });
          }

          // Observations from vitals
          if (vitals) {
            for (const v of vitals) entries.push({ resource: mapVitalsToObservation(v) });
          }

          const bundle = {
            resourceType: "Bundle",
            type: "searchset",
            total: entries.length,
            entry: entries.map((r) => ({ resource: r.resource })),
          };

          return new Response(JSON.stringify(bundle), { status: 200, headers: { "Content-Type": "application/fhir+json; charset=utf-8" } });
        } catch (err: any) {
          return new Response(err?.message ?? String(err), { status: 500 });
        }
      },
    },
  },
});
