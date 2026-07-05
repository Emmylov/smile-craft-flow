import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

type Conversation = {
  id: string;
  name: string | null;
  is_group: boolean;
  last_message_at: string;
  created_by: string | null;
  participants: { user_id: string; full_name: string | null }[];
};

type Staff = { user_id: string; full_name: string };

function ChatPage() {
  const { hospital, userId, profile } = useKairos();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    if (!userId) return;
    // Get conversation ids the user participates in
    const { data: myParts } = await supabase
      .from("chat_participants")
      .select("conversation_id")
      .eq("user_id", userId);
    const ids = (myParts ?? []).map((p) => p.conversation_id);
    if (ids.length === 0) {
      setConversations([]);
      return;
    }
    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("*")
      .in("id", ids)
      .order("last_message_at", { ascending: false });
    const { data: parts } = await supabase
      .from("chat_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", ids);
    const userIds = Array.from(new Set((parts ?? []).map((p) => p.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);
    const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));
    const withParts = (convs ?? []).map((c) => ({
      ...c,
      participants: (parts ?? [])
        .filter((p) => p.conversation_id === c.id)
        .map((p) => ({ user_id: p.user_id, full_name: nameMap.get(p.user_id) ?? null })),
    })) as Conversation[];
    setConversations(withParts);
  };

  const loadStaff = async () => {
    if (!hospital?.id || !userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("hospital_id", hospital.id)
      .neq("user_id", userId);
    setStaff((data ?? []) as Staff[]);
  };

  useEffect(() => {
    loadConversations();
    loadStaff();
  }, [hospital?.id, userId]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 9e9 }), 50);
  };

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    const ch = supabase
      .channel(`chat-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          setMessages((m) => [...m, payload.new]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: 9e9 }), 50);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeId]);

  // Global listener for conversation list updates
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`chat-inbox-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, loadConversations)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, loadConversations)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);

  const send = async () => {
    if (!text.trim() || !activeId || !hospital?.id || !userId) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: activeId,
      sender_id: userId,
      hospital_id: hospital.id,
      body,
    });
    if (error) toast.error(error.message);
  };

  const startConversation = async (targets: string[], name: string, isGroup: boolean) => {
    if (!hospital?.id || !userId) return;
    // If direct chat, try to find an existing 1:1
    if (!isGroup && targets.length === 1) {
      const other = targets[0];
      const existing = conversations.find(
        (c) => !c.is_group && c.participants.length === 2 && c.participants.some((p) => p.user_id === other),
      );
      if (existing) {
        setActiveId(existing.id);
        setNewOpen(false);
        return;
      }
    }
    const { data: conv, error } = await supabase
      .from("chat_conversations")
      .insert({
        hospital_id: hospital.id,
        created_by: userId,
        is_group: isGroup,
        name: isGroup ? name || "New group" : null,
      })
      .select()
      .single();
    if (error || !conv) return toast.error(error?.message ?? "Failed");
    const rows = [{ conversation_id: conv.id, user_id: userId }, ...targets.map((t) => ({ conversation_id: conv.id, user_id: t }))];
    await supabase.from("chat_participants").insert(rows);
    setNewOpen(false);
    await loadConversations();
    setActiveId(conv.id);
  };

  const nameFor = (c: Conversation) => {
    if (c.is_group) return c.name || "Group";
    const other = c.participants.find((p) => p.user_id !== userId);
    return other?.full_name ?? "Direct chat";
  };

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Chat privately or in groups with clinicians across your hospital"
        actions={
          <button
            onClick={() => setNewOpen(true)}
            className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            + New chat
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Conversations
          </div>
          <div className="overflow-y-auto flex-1">
            {conversations.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No chats yet. Start a new one.</div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${activeId === c.id ? "bg-blue-50" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${c.is_group ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                      {c.is_group ? "G" : (nameFor(c)[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{nameFor(c)}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {c.is_group ? `${c.participants.length} members` : "Direct"} · {new Date(c.last_message_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
              Select a conversation, or start a new one.
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-100">
                <div className="font-semibold">{nameFor(active)}</div>
                <div className="text-[11px] text-slate-500">
                  {active.is_group ? active.participants.map((p) => p.full_name).filter(Boolean).join(", ") : "Direct message"}
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-2 bg-slate-50">
                {messages.map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-blue-500 text-white rounded-br-sm" : "bg-white border border-slate-200 rounded-bl-sm"}`}>
                        {!mine && active.is_group && (
                          <div className="text-[10px] font-semibold text-slate-500 mb-0.5">
                            {active.participants.find((p) => p.user_id === m.sender_id)?.full_name ?? "—"}
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        <div className={`text-[10px] mt-0.5 ${mine ? "text-blue-100" : "text-slate-400"}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 p-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder={`Message ${nameFor(active)}`}
                  className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={send}
                  className="bg-blue-500 hover:bg-blue-400 text-white rounded-full w-10 h-10 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {newOpen && (
        <NewChatDialog
          staff={staff}
          onClose={() => setNewOpen(false)}
          onCreate={startConversation}
          me={profile?.full_name ?? "You"}
        />
      )}
    </div>
  );
}

function NewChatDialog({
  staff,
  onClose,
  onCreate,
  me,
}: {
  staff: Staff[];
  onClose: () => void;
  onCreate: (targets: string[], name: string, isGroup: boolean) => void;
  me: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const isGroup = selected.length > 1;

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const filtered = staff.filter((s) => s.full_name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-lg mb-1">Start a chat</h3>
        <p className="text-xs text-slate-500 mb-4">Select one colleague for a direct message, or multiple to create a group.</p>
        {isGroup && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
          />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search colleagues"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
        />
        <div className="max-h-64 overflow-y-auto -mx-1">
          {filtered.length === 0 && <div className="text-sm text-slate-500 p-3">No colleagues found.</div>}
          {filtered.map((s) => (
            <label
              key={s.user_id}
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(s.user_id)}
                onChange={() => toggle(s.user_id)}
              />
              <div className="text-sm">{s.full_name || s.user_id.slice(0, 6)}</div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm text-slate-600 px-3 py-2">Cancel</button>
          <button
            disabled={selected.length === 0}
            onClick={() => onCreate(selected, name, isGroup)}
            className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            {isGroup ? "Create group" : "Start chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
