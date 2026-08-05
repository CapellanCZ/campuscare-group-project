-- Allow specialty consultations to use status 'ongoing' (dentist Start Consultation).

ALTER TABLE public.health_queue_tickets
  DROP CONSTRAINT IF EXISTS health_queue_tickets_status_check;

ALTER TABLE public.health_queue_tickets
  ADD CONSTRAINT health_queue_tickets_status_check
  CHECK (status IN ('waiting', 'called', 'ongoing', 'completed', 'expired', 'no_show'));

-- Public TV board: include ongoing as an active ticket status.
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
  t.status IN ('waiting', 'called', 'ongoing')
  OR (
    t.status = 'completed'
    AND COALESCE(t.updated_at, t.created_at, now()) >= now() - interval '14 days'
  );

GRANT SELECT ON public.public_queue_display TO anon, authenticated;

-- Notify staff when a consultation becomes ongoing (dentist Start Consultation).
CREATE OR REPLACE FUNCTION public.notify_on_queue_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  roles public.web_role[];
  label text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       OLD.status IS DISTINCT FROM NEW.status
       OR OLD.station IS DISTINCT FROM NEW.station
     )
     AND NEW.status IN ('waiting', 'called', 'ongoing') THEN
    roles := CASE NEW.station
      WHEN 'nurse' THEN ARRAY['nurse'::public.web_role, 'admin'::public.web_role]
      WHEN 'physician' THEN ARRAY['physician'::public.web_role, 'nurse'::public.web_role]
      WHEN 'dentist' THEN ARRAY['dentist'::public.web_role, 'nurse'::public.web_role]
      ELSE ARRAY['nurse'::public.web_role, 'admin'::public.web_role]
    END;

    label := CASE NEW.status
      WHEN 'called' THEN 'Patient called'
      WHEN 'ongoing' THEN 'Consultation ongoing'
      ELSE 'Queue update'
    END;

    PERFORM public.create_staff_notifications(
      'queue',
      label,
      COALESCE(NEW.patient_name, 'A patient') || ' · ticket ' || COALESCE(NEW.ticket_code, NEW.queue_number::text, '—'),
      CASE NEW.station
        WHEN 'physician' THEN '/physician/queue'
        WHEN 'dentist' THEN '/dentist/queue'
        ELSE '/nurse/queue'
      END,
      roles,
      jsonb_build_object('ticket_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;
