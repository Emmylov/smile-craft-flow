import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Database, Json } from "@/integrations/supabase/types";

type AuraChatBody = {
  messages?: UIMessage[];
  threadId?: string;
  context?: {
    pagePath?: string;
    patientId?: string | null;
    patientName?: string | null;
    role?: string | null;
  };
};

export const Route = createFileRoute("/api/aura/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const token = authHeader.replace("Bearer ", "");
        const body = (await request.json()) as AuraChatBody;
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (!messages.length || !body.threadId) return new Response("Messages and threadId are required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        const url = process.env.SUPABASE_URL;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        if (!url || !publishableKey) return new Response("Missing backend configuration", { status: 500 });

        const supabase = createClient<Database>(url, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) return new Response("Unauthorized", { status: 401 });

        const { data: thread, error: threadError } = await supabase
          .from("aura_threads")
          .select("id, hospital_id, title")
          .eq("id", body.threadId)
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (threadError) return new Response(threadError.message, { status: 500 });
        if (!thread) return new Response("Thread not found", { status: 404 });

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, hospital_id, departments(name)")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("hospital_id", thread.hospital_id)
          .maybeSingle();

        const contextJson = (body.context ?? {}) as Json;
        await saveNewMessages({ supabase, messages, threadId: thread.id, hospitalId: thread.hospital_id, userId: userData.user.id, context: contextJson });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: [
            "You are Aura, the calm intelligent healthcare operating assistant inside Kairos Core.",
            "You are not a generic chatbot. Be concise, clinically structured, professional, and workflow-aware.",
            "Respect healthcare privacy. If a request needs patient data that is not present in context, say what is missing instead of inventing.",
            `Current user: ${profile?.full_name ?? userData.user.email ?? "Kairos user"}`,
            `Current role: ${roleRow?.role ?? body.context?.role ?? "staff"}`,
            `Current page: ${body.context?.pagePath ?? "unknown"}`,
            body.context?.patientName ? `Current patient: ${body.context.patientName}` : "No specific patient is currently in context.",
          ].join("\n"),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            await saveNewMessages({
              supabase,
              messages: [responseMessage],
              threadId: thread.id,
              hospitalId: thread.hospital_id,
              userId: userData.user.id,
              context: contextJson,
            });
            await supabase.from("aura_interactions").insert({
              thread_id: thread.id,
              hospital_id: thread.hospital_id,
              user_id: userData.user.id,
              page_path: body.context?.pagePath ?? null,
              patient_id: body.context?.patientId ?? null,
              action: "chat",
              input_summary: textFromMessage(messages.at(-1)).slice(0, 500),
              output_summary: textFromMessage(responseMessage).slice(0, 500),
              status: "completed",
            });
          },
        });
      },
    },
  },
});

async function saveNewMessages({
  supabase,
  messages,
  threadId,
  hospitalId,
  userId,
  context,
}: {
  supabase: ReturnType<typeof createClient<Database>>;
  messages: UIMessage[];
  threadId: string;
  hospitalId: string;
  userId: string;
  context: Json;
}) {
  const rows = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      thread_id: threadId,
      hospital_id: hospitalId,
      user_id: userId,
      ai_message_id: message.id,
      role: message.role,
      parts: message.parts as Json,
      context,
    }));
  if (!rows.length) return;
  await supabase.from("aura_messages").upsert(rows, { onConflict: "thread_id,ai_message_id", ignoreDuplicates: true });
}

function textFromMessage(message: UIMessage | undefined) {
  return (message?.parts ?? []).map((part) => (part.type === "text" ? part.text : "")).join(" ").trim();
}
