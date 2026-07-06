
-- 1) SECURITY FIX: hospitals must not be world-readable (exposed email/access_key)
DROP POLICY IF EXISTS "Public can view hospital directory basics" ON public.hospitals;
-- Anon path to look up a hospital by workspace_id remains via SECURITY DEFINER
-- function public.verify_workspace(text) which returns only (id, name).
REVOKE EXECUTE ON FUNCTION public.verify_workspace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_workspace(text) TO anon, authenticated;

-- 2) SECURITY FIX: storage.objects DELETE policy for lab-results bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Hospital staff delete lab results'
  ) THEN
    CREATE POLICY "Hospital staff delete lab results" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'lab-results'
        AND (storage.foldername(name))[1] = public.get_my_hospital_id()::text
      );
  END IF;
END$$;

-- 3) ENTERPRISE STAFF INVITATIONS
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role public.app_role NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_invitations_hospital_idx ON public.staff_invitations(hospital_id);
CREATE INDEX IF NOT EXISTS staff_invitations_email_idx ON public.staff_invitations(lower(email));

GRANT SELECT, INSERT, UPDATE ON public.staff_invitations TO authenticated;
GRANT ALL ON public.staff_invitations TO service_role;

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invitations in their hospital"
  ON public.staff_invitations FOR ALL TO authenticated
  USING (hospital_id = public.get_my_hospital_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (hospital_id = public.get_my_hospital_id() AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_staff_invitations_updated
  BEFORE UPDATE ON public.staff_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Public token verification (no anon SELECT policy — returns safe columns only)
CREATE OR REPLACE FUNCTION public.verify_invitation(_token text)
RETURNS TABLE(
  invitation_id uuid,
  hospital_id uuid,
  hospital_name text,
  email text,
  full_name text,
  role public.app_role,
  department_name text,
  expires_at timestamptz,
  status text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    i.id, h.id, h.name, i.email, i.full_name, i.role, d.name,
    i.expires_at,
    CASE
      WHEN i.revoked_at IS NOT NULL THEN 'revoked'
      WHEN i.accepted_at IS NOT NULL THEN 'accepted'
      WHEN i.expires_at < now() THEN 'expired'
      ELSE 'pending'
    END
  FROM public.staff_invitations i
  JOIN public.hospitals h ON h.id = i.hospital_id
  LEFT JOIN public.departments d ON d.id = i.department_id
  WHERE i.token = _token
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invitation(text) TO anon, authenticated;

-- 5) Secure invitation acceptance (SECURITY DEFINER — validates token + user)
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _full_name text)
RETURNS TABLE(hospital_id uuid, hospital_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _inv record;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  SELECT * INTO _inv FROM public.staff_invitations WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
  IF _inv.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation revoked'; END IF;
  IF _inv.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation already accepted'; END IF;
  IF _inv.expires_at < now() THEN RAISE EXCEPTION 'Invitation expired'; END IF;
  IF lower(_inv.email) <> lower(_email) THEN
    RAISE EXCEPTION 'This invitation was sent to %', _inv.email;
  END IF;

  -- Ensure the user is not already tied to another hospital
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid AND hospital_id IS NOT NULL AND hospital_id <> _inv.hospital_id) THEN
    RAISE EXCEPTION 'You already belong to another hospital workspace';
  END IF;

  INSERT INTO public.profiles (user_id, hospital_id, full_name, email, department_id)
  VALUES (_uid, _inv.hospital_id, COALESCE(_full_name, _inv.full_name, _email), _email, _inv.department_id)
  ON CONFLICT (user_id) DO UPDATE
    SET hospital_id = EXCLUDED.hospital_id,
        department_id = COALESCE(public.profiles.department_id, EXCLUDED.department_id),
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  INSERT INTO public.user_roles (user_id, hospital_id, role)
  VALUES (_uid, _inv.hospital_id, _inv.role)
  ON CONFLICT (user_id, hospital_id, role) DO NOTHING;

  UPDATE public.staff_invitations
    SET accepted_at = now(), accepted_by = _uid
    WHERE id = _inv.id;

  RETURN QUERY SELECT h.id, h.name FROM public.hospitals h WHERE h.id = _inv.hospital_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text, text) TO authenticated;
