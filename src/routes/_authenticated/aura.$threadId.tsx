import { createFileRoute, Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createAuraThread, getAuraThread, listAuraThreads } from "@/lib/aura.functions";
import { PageHeader } from "@/components/app-shell";
import { AuraMark } from "@/components/aura-mark";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/aura/$threadId")({
  component: AuraThreadPage,
});

type ThreadRow = { id: string; title: string; pinned: boolean; last_message_at: string };
type AuraThreadResult = { thread: { title: string }; messages: UIMessage[] };

function AuraThreadPage() {
  const { threadId } = useParams({ from: "/_authenticated/aura/$threadId" });
  return <AuraChatWorkspace key={threadId} threadId={threadId} />;
}

function AuraChatWorkspace({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const listThreads = useServerFn(listAuraThreads);
  const createThread = useServerFn(createAuraThread);
  const getThread = useServerFn(getAuraThread);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [threadTitle, setThreadTitle] = useState("Aura thread");
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [ready, setReady] = useState(false);

  const focusComposer = () => {
    setTimeout(() => document.querySelector<HTMLTextAreaElement>('textarea[name="message"]')?.focus(), 80);
  };

  const context = useMemo(() => ({ pagePath: pathname, role: null, patientId: null, patientName: null }), [pathname]);

  const transport = useMemo(
    () => new DefaultChatTransport<UIMessage>({
      api: "/api/aura/chat",
      prepareSendMessagesRequest: async ({ messages }) => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Please sign in again before using Aura.");
        return {
          headers: { Authorization: `Bearer ${token}` },
          body: { messages, threadId, context },
        };
      },
    }),
    [context, threadId],
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "Aura could not respond."),
  });

  const refreshThreads = async () => setThreads((await listThreads()) as ThreadRow[]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [threadDataRaw, threadList] = await Promise.all([getThread({ data: { threadId } }), listThreads()]);
        if (cancelled) return;
        const threadData = threadDataRaw as AuraThreadResult;
        setThreadTitle(threadData.thread.title);
        setInitialMessages(threadData.messages);
        setMessages(threadData.messages);
        setThreads(threadList as ThreadRow[]);
        setReady(true);
        focusComposer();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Aura thread could not load.");
        navigate({ to: "/aura", replace: true });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [getThread, listThreads, navigate, setMessages, threadId]);

  useEffect(() => {
    if (status === "ready") {
      refreshThreads();
      focusComposer();
    }
  }, [status]);

  const startNew = async () => {
    const thread = await createThread({ data: { title: "New Aura thread" } });
    navigate({ to: "/aura/$threadId", params: { threadId: thread.id } });
  };

  const submit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    await sendMessage({ text });
  };

  return (
    <div>
      <PageHeader
        title="Aura"
        subtitle="Threaded, contextual operating intelligence for Kairos Core"
        actions={<button onClick={startNew} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">New thread</button>}
      />
      <div className="grid min-h-[calc(100vh-190px)] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <AuraMark size="sm" />
            <div>
              <div className="text-sm font-semibold text-slate-950">Aura threads</div>
              <div className="text-xs text-slate-500">Persistent assistant history</div>
            </div>
          </div>
          <div className="space-y-1">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                to="/aura/$threadId"
                params={{ threadId: thread.id }}
                className={`block rounded-lg px-3 py-2 text-sm ${thread.id === threadId ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <div className="truncate font-medium">{thread.title}</div>
                <div className="text-[11px] opacity-70">{new Date(thread.last_message_at).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <AuraMark size="sm" />
            <div>
              <h2 className="font-semibold text-slate-950">{threadTitle}</h2>
              <p className="text-xs text-slate-500">Aura knows this workspace, your role, and the page context.</p>
            </div>
          </div>

          <Conversation className="min-h-0 bg-slate-50/70">
            <ConversationContent>
              {ready && messages.length === 0 && (
                <ConversationEmptyState
                  icon={<AuraMark size="lg" />}
                  title="How can Aura help?"
                  description="Ask for patient summaries, operational insights, SOAP notes, handovers, or workflow support."
                />
              )}
              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent className={message.role === "user" ? "bg-slate-950 text-white" : "bg-transparent px-0 py-0"}>
                    {message.parts.map((part, index) => part.type === "text" ? <MessageResponse key={index}>{part.text}</MessageResponse> : null)}
                  </MessageContent>
                </Message>
              ))}
              {status === "submitted" && <Shimmer className="text-sm" duration={1.4}>Aura is thinking…</Shimmer>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {error && <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error.message}</div>}
          <div className="border-t border-slate-100 p-4">
            <PromptInput onSubmit={submit}>
              <PromptInputTextarea placeholder="Ask Aura about this hospital workspace…" />
              <PromptInputFooter className="justify-between">
                <div className="text-xs text-slate-500">Clinical outputs should be reviewed before saving.</div>
                <PromptInputSubmit status={status} disabled={status === "submitted" || status === "streaming"} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </section>
      </div>
    </div>
  );
}
