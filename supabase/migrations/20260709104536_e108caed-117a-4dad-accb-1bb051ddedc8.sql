
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ALTER COLUMN body DROP NOT NULL;

-- Storage RLS for chat-attachments bucket: hospital-scoped by first path segment
DROP POLICY IF EXISTS "chat attachments read same hospital" ON storage.objects;
CREATE POLICY "chat attachments read same hospital"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = public.get_my_hospital_id()::text
  );

DROP POLICY IF EXISTS "chat attachments insert same hospital" ON storage.objects;
CREATE POLICY "chat attachments insert same hospital"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = public.get_my_hospital_id()::text
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "chat attachments delete own" ON storage.objects;
CREATE POLICY "chat attachments delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND owner = auth.uid()
  );
