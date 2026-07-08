import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useKairos } from "@/hooks/use-kairos";
import { PageHeader } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

const QUICK_EMOJI = ["👍", "❤️", "😂", "🎉", "🙏", "👀"];

type Participant = {
  user_id: string;
  full_name: string | null;
  last_read_at: string | null;
  typing_until: string | null;
  last_seen_at: string | null;
};

type Conversation = {
  id: string;
  name: string | null;
  is_group: boolean;
  last_message_at: string;
  created_by: string | null;
  participants: Participant[];
  unread: number;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  hospital_id: string;
  body: string;
  created_at: string;
  reply_to_id: string | null;
  pinned_at: string | null;
  pinned_by: string | null;
  edited_at: string | null;
  mentions: string[];
};

type Reaction = { id: string; message_id: string; user_id: string; emoji: string };
type Staff = { user_id: string; full_name: string };

function ChatPage() {
  const { hospital, userId, profile } = useKairos();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = async () => {
    if (!userId) return;
    const { data: myParts } = await supabase.from("chat_participants").select("conversation_id").eq("user_id", userId);
    const ids = (myParts ?? []).map((p) => p.conversation_id);
    if (ids.length === 0) {
      setConversations([]);
      return;
    }
    const { data: convs } = await supabase.from("chat_conversations").select("*").in("id", ids).order("last_message_at", { ascending: false });
    const { data: parts } = await supabase.from("chat_participants").select("conversation_id, user_id, last_read_at, typing_until, last_seen_at").in("conversation_id", ids);
    const { data: messageRows } = await supabase.from("chat_messages").select("conversation_id, sender_id, created_at").in("conversation_id", ids);
    const userIds = Array.from(new Set((parts ?? []).map((p) => p.user_id)));
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));
    const withParts = (convs ?? []).map((c) => {
      const participants = (parts ?? [])
        .filter((p) => p.conversation_id === c.id)
        .map((p) => ({
          user_id: p.user_id,
          full_name: nameMap.get(p.user_id) ?? null,
          last_read_at: p.last_read_at ?? null,
          typing_until: p.typing_until ?? null,
          last_seen_at: p.last_seen_at ?? null,
        }));
      const me = participants.find((p) => p.user_id === userId);
      const lastRead = me?.last_read_at ? new Date(me.last_read_at).getTime() : 0;
      const unread = (messageRows ?? []).filter((m) => m.conversation_id === c.id && m.sender_id !== userId && new Date(m.created_at).getTime() > lastRead).length;
      return { ...c, participants, unread };
    }) as Conversation[];
    setConversations(withParts);
  };

  const loadStaff = async () => {
    if (!hospital?.id || !userId) return;
    const { data } = await supabase.from("profiles").select("user_id, full_name").eq("hospital_id", hospital.id).neq("user_id", userId);
    setStaff((data ?? []) as Staff[]);
  };

  useEffect(() => {
    loadConversations();
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital?.id, userId]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase.from("chat_messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    setMessages((data ?? []) as Message[]);
    const { data: rx } = await supabase.from("chat_reactions").select("id, message_id, user_id, emoji").eq("conversation_id", convId);
    setReactions((rx ?? []) as Reaction[]);
    await markRead(convId);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 9e9 }), 50);
  };

  const markRead = async (convId: string) => {
    if (!userId) return;
    await supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), typing_until: null })
      .eq("conversation_id", convId)
      .eq("user_id", userId);
    loadConversations();
  };

  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    const ch = supabase
      .channel(`chat-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeId}` }, (payload) => {
        setMessages((m) => [...m, payload.new as Message]);
        if ((payload.new as Message).sender_id !== userId) markRead(activeId);
        setTimeout(() => scrollRef.current?.scrollTo({ top: 9e9 }), 50);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeId}` }, (payload) => {
        setMessages((m) => m.map((x) => (x.id === (payload.new as Message).id ? (payload.new as Message) : x)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reactions", filter: `conversation_id=eq.${activeId}` }, (payload) => {
        if (payload.eventType === "INSERT") setReactions((r) => [...r, payload.new as Reaction]);
        else if (payload.eventType === "DELETE") setReactions((r) => r.filter((x) => x.id !== (payload.old as Reaction).id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_participants", filter: `conversation_id=eq.${activeId}` }, () => {
        loadConversations();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

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

  useEffect(() => {
    if (!active || !userId) return setTypingNames([]);
    const now = Date.now();
    setTypingNames(
      active.participants
        .filter((p) => p.user_id !== userId && p.typing_until && new Date(p.typing_until).getTime() > now)
        .map((p) => p.full_name ?? "Someone"),
    );
  }, [active, userId]);

  const pulseTyping = async () => {
    if (!activeId || !userId) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    await supabase
      .from("chat_participants")
      .update({ typing_until: new Date(Date.now() + 4500).toISOString(), last_seen_at: new Date().toISOString() })
      .eq("conversation_id", activeId)
      .eq("user_id", userId);
    typingTimer.current = setTimeout(() => {
      supabase.from("chat_participants").update({ typing_until: null }).eq("conversation_id", activeId).eq("user_id", userId);
    }, 5000);
  };

  const send = async () => {
    if (!text.trim() || !activeId || !hospital?.id || !userId || !active) return;
    const body = text.trim();
    // Parse @mentions against active participants
    const nameToId = new Map<string, string>();
    active.participants.forEach((p) => p.full_name && nameToId.set(p.full_name.toLowerCase(), p.user_id));
    const mentioned = new Set<string>();
    for (const [name, id] of nameToId) {
      const re = new RegExp("@" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (re.test(body) && id !== userId) mentioned.add(id);
    }

    setText("");
    setReplyTo(null);
    setMentionQuery(null);
    const { data: inserted, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: activeId,
        sender_id: userId,
        hospital_id: hospital.id,
        body,
        reply_to_id: replyTo?.id ?? null,
        mentions: Array.from(mentioned),
      })
      .select()
      .single();
    if (error) return toast.error(error.message);

    if (mentioned.size > 0 && inserted) {
      const senderName = profile?.full_name ?? "A colleague";
      const rows = Array.from(mentioned).map((uid) => ({
        hospital_id: hospital.id,
        user_id: uid,
        type: "mention",
        message: `${senderName} mentioned you: ${body.slice(0, 120)}`,
        link: "/chat",
        conversation_id: activeId,
        read: false,
      }));
      await supabase.from("notifications").insert(rows);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!userId || !activeId) return;
    const existing = reactions.find((r) => r.message_id === messageId && r.user_id === userId && r.emoji === emoji);
    if (existing) {
      await supabase.from("chat_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("chat_reactions").insert({ message_id: messageId, conversation_id: activeId, user_id: userId, emoji });
    }
    setPickerFor(null);
  };

  const togglePin = async (m: Message) => {
    if (!userId) return;
    await supabase
      .from("chat_messages")
      .update(m.pinned_at ? { pinned_at: null, pinned_by: null } : { pinned_at: new Date().toISOString(), pinned_by: userId })
      .eq("id", m.id);
  };

  const startConversation = async (targets: string[], name: string, isGroup: boolean) => {
    if (!hospital?.id || !userId) return;
    if (!isGroup && targets.length === 1) {
      const other = targets[0];
      const existing = conversations.find((c) => !c.is_group && c.participants.length === 2 && c.participants.some((p) => p.user_id === other));
      if (existing) {
        setActiveId(existing.id);
        setNewOpen(false);
        return;
      }
    }
    const { data: conv, error } = await supabase
      .from("chat_conversations")
      .insert({ hospital_id: hospital.id, created_by: userId, is_group: isGroup, name: isGroup ? name || "New group" : null })
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

  const messagesById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const pinned = useMemo(() => messages.filter((m) => m.pinned_at), [messages]);
  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase();
    return messages.filter((m) => m.body.toLowerCase().includes(q));
  }, [messages, search]);

  const onInputChange = (v: string) => {
    setText(v);
    pulseTyping();
    // detect trailing "@word"
    const el = inputRef.current;
    const caret = el?.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const m = before.match(/(?:^|\s)@([\w\-]{0,30})$/);
    setMentionQuery(m ? m[1] : null);
  };

  const insertMention = (name: string) => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    const caret = el.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([\w\-]{0,30})$/, `@${name} `);
    const after = text.slice(caret);
    const next = before + after;
    setText(next);
    setMentionQuery(null);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = before.length;
    }, 0);
  };

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null || !active) return [];
    const q = mentionQuery.toLowerCase();
    return active.participants
      .filter((p) => p.user_id !== userId && p.full_name && p.full_name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, active, userId]);

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Chat privately or in groups with clinicians across your hospital"
        actions={
          <button onClick={() => setNewOpen(true)} className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            + New chat
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">Conversations</div>
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
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">{nameFor(c)}</div>
                        {c.unread > 0 && <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">{c.unread}</span>}
                      </div>
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
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500">Select a conversation, or start a new one.</div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{nameFor(active)}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {active.is_group ? active.participants.map((p) => p.full_name).filter(Boolean).join(", ") : "Direct message"}
                  </div>
                  {typingNames.length > 0 && <div className="text-[11px] font-medium text-blue-600">{typingNames.join(", ")} typing…</div>}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-1.5 text-slate-400 text-[18px]">search</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search messages"
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                  />
                </div>
              </div>

              {pinned.length > 0 && (
                <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 overflow-x-auto">
                  <span className="material-symbols-outlined text-amber-600 text-[16px]">push_pin</span>
                  <div className="flex gap-2">
                    {pinned.map((p) => (
                      <div key={p.id} className="text-[11px] bg-white border border-amber-200 rounded-full px-3 py-1 whitespace-nowrap max-w-[240px] truncate">
                        {p.body}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-2 bg-slate-50">
                {filteredMessages.map((m) => {
                  const mine = m.sender_id === userId;
                  const replied = m.reply_to_id ? messagesById.get(m.reply_to_id) : null;
                  const msgRx = reactions.filter((r) => r.message_id === m.id);
                  const rxGrouped = Array.from(msgRx.reduce((a, r) => a.set(r.emoji, (a.get(r.emoji) ?? 0) + 1), new Map<string, number>()));
                  return (
                    <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[70%] relative">
                        <div className={`px-3 py-2 rounded-2xl text-sm ${mine ? "bg-blue-500 text-white rounded-br-sm" : "bg-white border border-slate-200 rounded-bl-sm"} ${m.pinned_at ? "ring-2 ring-amber-300" : ""}`}>
                          {!mine && active.is_group && (
                            <div className="text-[10px] font-semibold text-slate-500 mb-0.5">
                              {active.participants.find((p) => p.user_id === m.sender_id)?.full_name ?? "—"}
                            </div>
                          )}
                          {replied && (
                            <div className={`mb-1 text-[11px] border-l-2 pl-2 truncate ${mine ? "border-white/50 text-blue-50" : "border-slate-300 text-slate-500"}`}>
                              ↳ {replied.body.slice(0, 80)}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap">
                            {m.body.split(/(@[\w\-]+(?:\s[\w\-]+)?)/g).map((chunk, i) =>
                              chunk.startsWith("@") ? (
                                <span key={i} className={mine ? "font-semibold underline" : "font-semibold text-blue-600"}>{chunk}</span>
                              ) : (
                                <span key={i}>{chunk}</span>
                              ),
                            )}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${mine ? "text-blue-100" : "text-slate-400"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {m.edited_at && " · edited"}
                            {mine && active.participants.some((p) => p.user_id !== userId && p.last_read_at && new Date(p.last_read_at).getTime() >= new Date(m.created_at).getTime()) && " · Read"}
                          </div>
                        </div>
                        {rxGrouped.length > 0 && (
                          <div className={`flex gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
                            {rxGrouped.map(([emo, count]) => {
                              const iReacted = msgRx.some((r) => r.emoji === emo && r.user_id === userId);
                              return (
                                <button
                                  key={emo}
                                  onClick={() => toggleReaction(m.id, emo)}
                                  className={`text-[11px] px-1.5 py-0.5 rounded-full border ${iReacted ? "bg-blue-100 border-blue-300" : "bg-white border-slate-200"}`}
                                >
                                  {emo} {count}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className={`absolute -top-3 ${mine ? "left-0" : "right-0"} opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 bg-white border border-slate-200 rounded-full shadow px-1 py-0.5`}>
                          <button title="React" onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)} className="w-6 h-6 rounded-full hover:bg-slate-100 text-[14px]">😊</button>
                          <button title="Reply" onClick={() => { setReplyTo(m); inputRef.current?.focus(); }} className="w-6 h-6 rounded-full hover:bg-slate-100">
                            <span className="material-symbols-outlined text-[14px] leading-none">reply</span>
                          </button>
                          <button title={m.pinned_at ? "Unpin" : "Pin"} onClick={() => togglePin(m)} className="w-6 h-6 rounded-full hover:bg-slate-100">
                            <span className="material-symbols-outlined text-[14px] leading-none">{m.pinned_at ? "keep_off" : "push_pin"}</span>
                          </button>
                        </div>
                        {pickerFor === m.id && (
                          <div className={`absolute -top-10 ${mine ? "left-0" : "right-0"} bg-white border border-slate-200 rounded-full shadow px-2 py-1 flex gap-1 z-10`}>
                            {QUICK_EMOJI.map((e) => (
                              <button key={e} onClick={() => toggleReaction(m.id, e)} className="hover:scale-125 transition text-lg leading-none">{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredMessages.length === 0 && search && (
                  <div className="text-center text-xs text-slate-500 py-6">No messages match “{search}”.</div>
                )}
              </div>

              {replyTo && (
                <div className="border-t border-slate-100 px-4 py-2 bg-slate-50 flex items-center gap-2 text-xs">
                  <span className="material-symbols-outlined text-slate-500 text-[16px]">reply</span>
                  <div className="flex-1 truncate text-slate-600">Replying to: {replyTo.body.slice(0, 100)}</div>
                  <button onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-slate-800">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              )}

              <div className="border-t border-slate-100 p-3 relative">
                {mentionSuggestions.length > 0 && (
                  <div className="absolute bottom-full left-3 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg w-64 z-20 overflow-hidden">
                    {mentionSuggestions.map((s) => (
                      <button
                        key={s.user_id}
                        onClick={() => insertMention(s.full_name!)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center">
                          {(s.full_name ?? "?")[0]?.toUpperCase()}
                        </div>
                        {s.full_name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && mentionSuggestions.length === 0) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder={`Message ${nameFor(active)} — use @ to mention`}
                    className="flex-1 border border-slate-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
                  />
                  <button onClick={send} className="bg-blue-500 hover:bg-blue-400 text-white rounded-full w-10 h-10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {newOpen && (
        <NewChatDialog staff={staff} onClose={() => setNewOpen(false)} onCreate={startConversation} me={profile?.full_name ?? "You"} />
      )}
    </div>
  );
}

function NewChatDialog({
  staff,
  onClose,
  onCreate,
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

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const filtered = staff.filter((s) => s.full_name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-lg mb-1">Start a chat</h3>
        <p className="text-xs text-slate-500 mb-4">Select one colleague for a direct message, or multiple to create a group.</p>
        {isGroup && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search colleagues" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3" />
        <div className="max-h-64 overflow-y-auto -mx-1">
          {filtered.length === 0 && <div className="text-sm text-slate-500 p-3">No colleagues found.</div>}
          {filtered.map((s) => (
            <label key={s.user_id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(s.user_id)} onChange={() => toggle(s.user_id)} />
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
