import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import type { Database } from "@/integrations/supabase/types";

type OrganizedDictation = {
  transcript: string;
  complaint: string;
  diagnosis: string;
  notes: string;
  patientFileNote: string;
};

export const Route = createFileRoute("/api/aura/dictate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
        const token = authHeader.replace("Bearer ", "");
        const key = process.env.LOVABLE_API_KEY;
        const url = process.env.SUPABASE_URL;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!key) return json({ error: "Missing LOVABLE_API_KEY" }, 500);
        if (!url || !publishableKey) return json({ error: "Missing backend configuration" }, 500);

        const form = await request.formData();
        const audio = form.get("audio");
        const patientId = form.get("patientId")?.toString() || null;
        const patientName = form.get("patientName")?.toString() || "this patient";
        if (!(audio instanceof File) || audio.size < 2048) return json({ error: "Recording was empty. Please try again." }, 400);

        const supabase = createClient<Database>(url, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);
        const { data: profile } = await supabase.from("profiles").select("hospital_id").eq("user_id", userData.user.id).maybeSingle();
        if (!profile?.hospital_id) return json({ error: "No hospital workspace linked." }, 403);

        const transcript = await transcribe(audio, key);
        const organized = await organizeDictation({ transcript, patientName, key });

        await supabase.from("aura_interactions").insert({
          hospital_id: profile.hospital_id,
          user_id: userData.user.id,
          patient_id: patientId,
          action: "clinical_dictation",
          input_summary: transcript.slice(0, 500),
          output_summary: organized.patientFileNote.slice(0, 500),
          status: "completed",
        });

        return json(organized);
      },
    },
  },
});

async function transcribe(audio: File, key: string) {
  const upstream = new FormData();
  upstream.append("model", "openai/gpt-4o-mini-transcribe");
  upstream.append("file", audio, "recording.wav");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: upstream,
  });
  if (!response.ok) throw new Error(`Transcription failed: ${response.status} ${await response.text().catch(() => "")}`);
  const payload = (await response.json()) as { text?: string };
  return payload.text?.trim() || "";
}

async function organizeDictation({ transcript, patientName, key }: { transcript: string; patientName: string; key: string }): Promise<OrganizedDictation> {
  const gateway = createLovableAiGatewayProvider(key);
  const result = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system: "You are Aura, organizing clinician dictation into concise patient chart fields. Return only valid JSON.",
    prompt: `Patient: ${patientName}\nTranscript: ${transcript}\n\nReturn JSON with keys: complaint, diagnosis, notes, patientFileNote. Keep diagnosis empty if not explicitly stated.`,
  });
  const parsed = parseJson(result.text);
  return {
    transcript,
    complaint: asString(parsed.complaint),
    diagnosis: asString(parsed.diagnosis),
    notes: asString(parsed.notes) || transcript,
    patientFileNote: asString(parsed.patientFileNote) || transcript,
  };
}

function parseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
