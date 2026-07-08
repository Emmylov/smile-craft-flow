import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/terminology/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const system = url.searchParams.get("system") ?? undefined;
          const q = url.searchParams.get("q") ?? "";
          const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            return new Response("Server configuration missing", { status: 500 });
          }

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });

          let query = supabase.from("terminology_codes").select("system, code, display").limit(limit);

          if (system) {
            query = query.eq("system", system);
          }

          if (q && q.trim().length) {
            const like = `%${q.trim()}%`;
            // Use OR on display or code
            query = query.or(`display.ilike.${like},code.ilike.${like}`);
          }

          const { data, error } = await query;
          if (error) return new Response(error.message, { status: 500 });

          return new Response(JSON.stringify(data ?? []), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(err?.message ?? String(err), { status: 500 });
        }
      },
    },
  },
});
