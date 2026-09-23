-- Phase 1: Minimize public queue display data exposure.
-- Safe columns only — no patient names, assigned personnel, or appointment joins.
-- Uses health_queue_tickets.station only (no health_appointments dependency).
-- Restrict queue_display authenticated role from reading full health_queue_tickets rows
-- (realtime + direct SELECT). Public board uses public_queue_display only.
--
-- DROP + CREATE is required: CREATE OR REPLACE cannot remove columns from an existing view.

DROP VIEW IF EXISTS public.public_queue_display;

CREATE VIEW public.public_queue_display
WITH (security_invoker = false) AS
SELECT
  t.id AS ticket_id,
  COALESCE(t.queue_number, t.queue_position) AS queue_number,
  t.ticket_code,
  t.status AS ticket_status,
  t.estimated_wait_minutes,
  t.updated_at AS ticket_updated_at,
  COALESCE(t.station, 'nurse') AS station
FROM public.health_queue_tickets t
WHERE
  t.status IN ('waiting', 'called', 'ongoing')
  OR (
    t.status = 'completed'
    AND COALESCE(t.updated_at, t.created_at, now()) >= now() - interval '14 days'
  );

GRANT SELECT ON public.public_queue_display TO anon, authenticated;

-- queue_display accounts keep clinic membership but must not read full ticket PHI.
DROP POLICY IF EXISTS "staff read queue tickets" ON public.health_queue_tickets;
CREATE POLICY "staff read queue tickets"
  ON public.health_queue_tickets
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND COALESCE(public.current_profile_role(), 'clinic_staff'::public.web_role)
      <> 'queue_display'::public.web_role
  );

DROP POLICY IF EXISTS "staff write queue tickets" ON public.health_queue_tickets;
CREATE POLICY "staff write queue tickets"
  ON public.health_queue_tickets
  FOR ALL
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND COALESCE(public.current_profile_role(), 'clinic_staff'::public.web_role)
      <> 'queue_display'::public.web_role
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND COALESCE(public.current_profile_role(), 'clinic_staff'::public.web_role)
      <> 'queue_display'::public.web_role
  );
