ALTER TABLE public.aura_messages
  ADD COLUMN IF NOT EXISTS ai_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_aura_messages_thread_ai_message_id
  ON public.aura_messages(thread_id, ai_message_id)
  WHERE ai_message_id IS NOT NULL;