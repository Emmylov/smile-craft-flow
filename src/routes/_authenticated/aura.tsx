import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createAuraThread, listAuraThreads } from "@/lib/aura.functions";
import { AuraMark } from "@/components/aura-mark";

export const Route = createFileRoute("/_authenticated/aura")({
  component: AuraRoute,
});

function AuraRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/aura") return <Outlet />;
  return <AuraStarter />;
}

function AuraStarter() {
  const navigate = useNavigate();
  const listThreads = useServerFn(listAuraThreads);
  const createThread = useServerFn(createAuraThread);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        const threads = (await listThreads()) as { id: string }[];
        const thread = threads[0] ?? (await createThread({ data: { title: "Aura workspace" } }));
        if (!cancelled) navigate({ to: "/aura/$threadId", params: { threadId: thread.id }, replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, [createThread, listThreads, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex justify-center"><AuraMark size="lg" /></div>
        <h1 className="text-2xl font-bold text-slate-950">Opening Aura</h1>
        <p className="mt-2 text-sm text-slate-500">{loading ? "Preparing your threaded assistant workspace…" : "Almost ready…"}</p>
      </div>
    </div>
  );
}
