-- Fix queue notification trigger to use health_queue_tickets.id
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
     AND NEW.status IN ('waiting', 'called') THEN
    roles := CASE NEW.station
      WHEN 'nurse' THEN ARRAY['nurse'::public.web_role, 'admin'::public.web_role]
      WHEN 'physician' THEN ARRAY['physician'::public.web_role, 'nurse'::public.web_role]
      WHEN 'dentist' THEN ARRAY['dentist'::public.web_role, 'nurse'::public.web_role]
      ELSE ARRAY['nurse'::public.web_role, 'admin'::public.web_role]
    END;

    label := CASE NEW.status
      WHEN 'called' THEN 'Patient called'
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
