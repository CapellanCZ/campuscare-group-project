-- Public TV board view + realtime for queue tickets

CREATE OR REPLACE VIEW public.public_queue_display
WITH (security_invoker = false) AS
SELECT
  t.id AS ticket_id,
  COALESCE(t.queue_number, t.queue_position) AS queue_number,
  t.ticket_code,
  t.status AS ticket_status,
  t.estimated_wait_minutes,
  t.checked_in_at,
  t.updated_at AS ticket_updated_at,
  a.id AS appointment_id,
  a.workflow_status,
  a.provider_queue,
  a.consultation_type,
  a.service,
  a.doctor AS assigned_personnel,
  a.consultation_completed_at,
  CASE
    WHEN s.first_name IS NOT NULL THEN
      trim(s.first_name) || CASE WHEN s.last_name IS NOT NULL AND length(trim(s.last_name)) > 0 THEN ' ' || left(trim(s.last_name), 1) || '.' ELSE '' END
    ELSE 'Patient'
  END AS patient_display_name,
  CASE
    WHEN COALESCE(a.provider_queue, '') = 'dentist' THEN 'dentist'
    WHEN COALESCE(a.provider_queue, '') = 'physician' THEN 'physician'
    WHEN a.workflow_status IN ('queued_for_nurse', 'checkin_window_open', 'booked') OR a.provider_queue IS NULL OR a.provider_queue = '' THEN 'nurse'
    ELSE 'nurse'
  END AS station
FROM health_queue_tickets t
LEFT JOIN health_appointments a
  ON a.id = COALESCE(t.health_appointment_id, t.appointment_id)
LEFT JOIN students s
  ON s.student_id = a.student_id
WHERE
  t.status IN ('waiting', 'called')
  OR (
    t.status = 'completed'
    AND COALESCE(t.updated_at, t.created_at, now()) >= now() - interval '14 days'
  );

GRANT SELECT ON public.public_queue_display TO anon, authenticated;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.health_queue_tickets;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
