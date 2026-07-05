
CREATE POLICY "Hospital staff read lab results" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'lab-results'
    AND (storage.foldername(name))[1] = public.get_my_hospital_id()::text
  );
CREATE POLICY "Hospital staff upload lab results" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'lab-results'
    AND (storage.foldername(name))[1] = public.get_my_hospital_id()::text
  );
CREATE POLICY "Hospital staff update lab results" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'lab-results'
    AND (storage.foldername(name))[1] = public.get_my_hospital_id()::text
  );
