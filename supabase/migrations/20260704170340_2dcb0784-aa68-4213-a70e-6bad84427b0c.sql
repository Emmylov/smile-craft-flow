
-- Remove broad anon access to the base table (it exposed access_key etc.)
DROP POLICY IF EXISTS "Public can view hospital directory basics" ON public.hospitals;
REVOKE SELECT ON public.hospitals FROM anon;

-- Recreate the directory as a definer view (bypasses RLS, exposes only safe columns)
DROP VIEW IF EXISTS public.hospital_directory;
CREATE VIEW public.hospital_directory
WITH (security_invoker = off) AS
  SELECT id, name, hospital_type, city, state, country, created_at
  FROM public.hospitals;
GRANT SELECT ON public.hospital_directory TO anon, authenticated;

-- Public, safe workspace verification used by the login flow (no sensitive fields returned)
CREATE OR REPLACE FUNCTION public.verify_workspace(_workspace_id text)
RETURNS TABLE (hospital_id uuid, hospital_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name FROM public.hospitals WHERE workspace_id = upper(trim(_workspace_id))
$$;
GRANT EXECUTE ON FUNCTION public.verify_workspace(text) TO anon, authenticated;
