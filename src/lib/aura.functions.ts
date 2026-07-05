import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuraThreadInput = { title?: string } | undefined;
type SerializableAuraMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  parts: { type: "text"; text: string }[];
};

function rowToMessage(row: { ai_message_id: string | null; id: string; role: string; parts: unknown }): SerializableAuraMessage {
  const parts = Array.isArray(row.parts)
    ? row.parts
        .filter((part): part is { type: "text"; text: string } =>
          !!part && typeof part === "object" && "type" in part && "text" in part && part.type === "text" && typeof part.text === "string",
        )
        .map((part) => ({ type: "text" as const, text: part.text }))
    : [];
  return {
    id: row.ai_message_id ?? row.id,
    role: row.role === "system" || row.role === "user" || row.role === "assistant" ? row.role : "assistant",
    parts,
  };
}

export const listAuraThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("aura_threads")
      .select("id, title, pinned, archived, last_message_at, created_at")
      .eq("user_id", context.userId)
      .eq("archived", false)
      .order("pinned", { ascending: false })
      .order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAuraThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AuraThreadInput) => input ?? {})
  .handler(async ({ data, context }) => {
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("hospital_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile?.hospital_id) throw new Error("No hospital workspace linked to your account.");

    const { data: thread, error } = await context.supabase
      .from("aura_threads")
      .insert({
        hospital_id: profile.hospital_id,
        user_id: context.userId,
        title: data.title?.trim() || "New Aura thread",
      })
      .select("id")
      .single();
    if (error || !thread) throw new Error(error?.message ?? "Unable to create Aura thread.");
    return { id: thread.id };
  });

export const getAuraThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: thread, error: threadError } = await context.supabase
      .from("aura_threads")
      .select("id, title, pinned, archived, last_message_at")
      .eq("id", data.threadId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (threadError) throw new Error(threadError.message);
    if (!thread) throw new Error("Aura thread not found.");

    const { data: messages, error: messageError } = await context.supabase
      .from("aura_messages")
      .select("id, ai_message_id, role, parts, created_at")
      .eq("thread_id", data.threadId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (messageError) throw new Error(messageError.message);

    return { thread, messages: (messages ?? []).map(rowToMessage) };
  });

export const updateAuraThreadTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { threadId: string; title: string; pinned?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("aura_threads")
      .update({ title: data.title.trim() || "Aura thread", pinned: data.pinned })
      .eq("id", data.threadId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
