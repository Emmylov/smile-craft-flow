
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS pinned_by uuid,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS mentions uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS chat_messages_conv_created_idx ON public.chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS chat_messages_pinned_idx ON public.chat_messages(conversation_id) WHERE pinned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS chat_messages_body_trgm_idx ON public.chat_messages USING gin (body public.gin_trgm_ops);

DROP POLICY IF EXISTS "Participants update messages" ON public.chat_messages;
CREATE POLICY "Participants update messages" ON public.chat_messages
  FOR UPDATE
  USING (public.is_conversation_participant(conversation_id, auth.uid()))
  WITH CHECK (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS chat_reactions_message_idx ON public.chat_reactions(message_id);

GRANT SELECT, INSERT, DELETE ON public.chat_reactions TO authenticated;
GRANT ALL ON public.chat_reactions TO service_role;

ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read reactions" ON public.chat_reactions
  FOR SELECT USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Users add own reactions" ON public.chat_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Users remove own reactions" ON public.chat_reactions
  FOR DELETE USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);

DROP POLICY IF EXISTS "Members manage notifications in their hospital" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR (user_id IS NULL AND hospital_id = public.get_my_hospital_id()));
CREATE POLICY "Users insert notifications in hospital" ON public.notifications
  FOR INSERT WITH CHECK (hospital_id = public.get_my_hospital_id());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
