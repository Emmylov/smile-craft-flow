
-- Activity log for staff invitations
CREATE TABLE IF NOT EXISTS public.staff_invitation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES public.staff_invitations(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('created','revoked','accepted','resent')),
  actor_id uuid,
  email text,
  role public.app_role,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.staff_invitation_events TO authenticated;
GRANT ALL ON public.staff_invitation_events TO service_role;

ALTER TABLE public.staff_invitation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view invitation events in their hospital"
  ON public.staff_invitation_events FOR SELECT TO authenticated
  USING (hospital_id = public.get_my_hospital_id() AND public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS staff_invitation_events_hospital_idx
  ON public.staff_invitation_events(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS staff_invitation_events_invitation_idx
  ON public.staff_invitation_events(invitation_id);

-- Trigger: log create + resent (metadata flag) on insert
CREATE OR REPLACE FUNCTION public.log_staff_invitation_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _event text := 'created';
  _meta jsonb := '{}'::jsonb;
BEGIN
  IF (current_setting('kairos.invite_resend', true) = 'true') THEN
    _event := 'resent';
    _meta := jsonb_build_object('replaced_invitation_id', current_setting('kairos.invite_replaced', true));
  END IF;
  INSERT INTO public.staff_invitation_events(hospital_id, invitation_id, event, actor_id, email, role, metadata)
  VALUES (NEW.hospital_id, NEW.id, _event, NEW.invited_by, NEW.email, NEW.role, _meta);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_invitation_insert_log ON public.staff_invitations;
CREATE TRIGGER trg_staff_invitation_insert_log
  AFTER INSERT ON public.staff_invitations
  FOR EACH ROW EXECUTE FUNCTION public.log_staff_invitation_insert();

-- Trigger: log revoke + accept on update
CREATE OR REPLACE FUNCTION public.log_staff_invitation_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    INSERT INTO public.staff_invitation_events(hospital_id, invitation_id, event, actor_id, email, role)
    VALUES (NEW.hospital_id, NEW.id, 'revoked', auth.uid(), NEW.email, NEW.role);
  END IF;
  IF NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL THEN
    INSERT INTO public.staff_invitation_events(hospital_id, invitation_id, event, actor_id, email, role)
    VALUES (NEW.hospital_id, NEW.id, 'accepted', NEW.accepted_by, NEW.email, NEW.role);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_invitation_update_log ON public.staff_invitations;
CREATE TRIGGER trg_staff_invitation_update_log
  AFTER UPDATE ON public.staff_invitations
  FOR EACH ROW EXECUTE FUNCTION public.log_staff_invitation_update();

-- Server-side resend helper: revoke old + create new invitation in one tx, tagged as 'resent'
CREATE OR REPLACE FUNCTION public.resend_staff_invitation(_invitation_id uuid)
RETURNS TABLE(id uuid, token text, email text, role public.app_role, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _old record;
  _new record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Only administrators can resend invitations'; END IF;

  SELECT * INTO _old FROM public.staff_invitations WHERE id = _invitation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF _old.hospital_id <> public.get_my_hospital_id() THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF _old.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Invitation already accepted'; END IF;

  -- Revoke the previous invite if still active
  IF _old.revoked_at IS NULL THEN
    UPDATE public.staff_invitations SET revoked_at = now() WHERE id = _old.id;
  END IF;

  -- Tag the next insert as a resend for the activity log trigger
  PERFORM set_config('kairos.invite_resend', 'true', true);
  PERFORM set_config('kairos.invite_replaced', _old.id::text, true);

  INSERT INTO public.staff_invitations (hospital_id, email, full_name, role, department_id, invited_by)
  VALUES (_old.hospital_id, _old.email, _old.full_name, _old.role, _old.department_id, _uid)
  RETURNING staff_invitations.id, staff_invitations.token, staff_invitations.email,
            staff_invitations.role, staff_invitations.expires_at
  INTO _new;

  PERFORM set_config('kairos.invite_resend', 'false', true);
  PERFORM set_config('kairos.invite_replaced', '', true);

  id := _new.id; token := _new.token; email := _new.email; role := _new.role; expires_at := _new.expires_at;
  RETURN NEXT;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.resend_staff_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resend_staff_invitation(uuid) TO authenticated;
