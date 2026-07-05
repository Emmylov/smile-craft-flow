
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_participants (
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
GRANT ALL ON public.chat_participants TO service_role;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_participants WHERE conversation_id = _conv_id AND user_id = _user_id)
$$;

CREATE POLICY "Participants view conversations" ON public.chat_conversations
  FOR SELECT TO authenticated USING (public.is_conversation_participant(id, auth.uid()));
CREATE POLICY "Users create conversations in their hospital" ON public.chat_conversations
  FOR INSERT TO authenticated WITH CHECK (hospital_id = public.get_my_hospital_id() AND created_by = auth.uid());
CREATE POLICY "Creator updates conversation" ON public.chat_conversations
  FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Participants view their participation" ON public.chat_participants
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid())
  );
CREATE POLICY "Users add participants" ON public.chat_participants
  FOR INSERT TO authenticated WITH CHECK (
    public.is_conversation_participant(conversation_id, auth.uid()) OR user_id = auth.uid()
  );
CREATE POLICY "Users leave conversations" ON public.chat_participants
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Participants read messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "Participants send messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_participant(conversation_id, auth.uid())
    AND hospital_id = public.get_my_hospital_id()
  );

CREATE TRIGGER trg_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.chat_conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bump_conv AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

ALTER TABLE public.queue_entries ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
CREATE OR REPLACE FUNCTION public.set_queue_completed_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_queue_completed ON public.queue_entries;
CREATE TRIGGER trg_queue_completed BEFORE UPDATE ON public.queue_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_queue_completed_at();

ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS result_url TEXT;
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.lab_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;

ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
