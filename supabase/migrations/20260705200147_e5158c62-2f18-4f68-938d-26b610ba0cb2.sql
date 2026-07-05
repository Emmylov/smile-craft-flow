ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS typing_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation_read
  ON public.chat_participants(conversation_id, last_read_at);

DROP POLICY IF EXISTS "Users update their chat presence" ON public.chat_participants;
CREATE POLICY "Users update their chat presence" ON public.chat_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE public.aura_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Aura thread',
  pinned BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aura_threads TO authenticated;
GRANT ALL ON public.aura_threads TO service_role;

ALTER TABLE public.aura_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their Aura threads" ON public.aura_threads
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND hospital_id = public.get_my_hospital_id())
  WITH CHECK (user_id = auth.uid() AND hospital_id = public.get_my_hospital_id());

CREATE TRIGGER trg_aura_threads_updated_at BEFORE UPDATE ON public.aura_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_aura_threads_user_recent
  ON public.aura_threads(user_id, archived, last_message_at DESC);

CREATE TABLE public.aura_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.aura_threads(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aura_messages TO authenticated;
GRANT ALL ON public.aura_messages TO service_role;

ALTER TABLE public.aura_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their Aura messages" ON public.aura_messages
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    AND hospital_id = public.get_my_hospital_id()
    AND EXISTS (
      SELECT 1 FROM public.aura_threads t
      WHERE t.id = aura_messages.thread_id
        AND t.user_id = auth.uid()
        AND t.hospital_id = public.get_my_hospital_id()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND hospital_id = public.get_my_hospital_id()
    AND EXISTS (
      SELECT 1 FROM public.aura_threads t
      WHERE t.id = aura_messages.thread_id
        AND t.user_id = auth.uid()
        AND t.hospital_id = public.get_my_hospital_id()
    )
  );

CREATE INDEX idx_aura_messages_thread_created
  ON public.aura_messages(thread_id, created_at);

CREATE OR REPLACE FUNCTION public.bump_aura_thread_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.aura_threads
  SET last_message_at = NEW.created_at,
      title = CASE
        WHEN title = 'New Aura thread' AND NEW.role = 'user'
        THEN left(coalesce(NEW.parts->0->>'text', 'Aura thread'), 64)
        ELSE title
      END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_aura_thread AFTER INSERT ON public.aura_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_aura_thread_last_message();

CREATE TABLE public.aura_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.aura_threads(id) ON DELETE SET NULL,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_path TEXT,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  action TEXT NOT NULL DEFAULT 'chat',
  input_summary TEXT,
  output_summary TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.aura_interactions TO authenticated;
GRANT ALL ON public.aura_interactions TO service_role;

ALTER TABLE public.aura_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view and create their Aura audit log" ON public.aura_interactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND hospital_id = public.get_my_hospital_id());

CREATE POLICY "Users create their Aura audit log" ON public.aura_interactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND hospital_id = public.get_my_hospital_id());

CREATE INDEX idx_aura_interactions_user_recent
  ON public.aura_interactions(user_id, created_at DESC);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.aura_threads;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.aura_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;