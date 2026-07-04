
-- Replace the definer view with a safe invoker view backed by column-level grants
DROP VIEW IF EXISTS public.hospital_directory;

-- Anon may read ONLY these safe columns from hospitals (column-level privilege)
GRANT SELECT (id, name, hospital_type, city, state, country, created_at)
  ON public.hospitals TO anon;

-- Row visibility for anon (columns already restricted above)
DROP POLICY IF EXISTS "Public can view hospital directory basics" ON public.hospitals;
CREATE POLICY "Public can view hospital directory basics"
  ON public.hospitals FOR SELECT TO anon USING (true);

-- Invoker view exposing only safe columns
CREATE VIEW public.hospital_directory
WITH (security_invoker = on) AS
  SELECT id, name, hospital_type, city, state, country, created_at
  FROM public.hospitals;
GRANT SELECT ON public.hospital_directory TO anon, authenticated;
