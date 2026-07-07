ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_invitation_events;
ALTER TABLE public.staff_invitation_events REPLICA IDENTITY FULL;