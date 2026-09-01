-- Employee announcement audience: reserved for future patient-app delivery.
-- Staff can publish; no staff inbox notification on publish.

CREATE OR REPLACE FUNCTION public.notify_on_announcement_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  roles public.web_role[];
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    IF lower(COALESCE(NEW.audience, 'all')) IN ('employee', 'student') THEN
      RETURN NEW;
    END IF;

    roles := CASE lower(COALESCE(NEW.audience, 'all'))
      WHEN 'nurse' THEN ARRAY['nurse'::public.web_role]
      WHEN 'physician' THEN ARRAY['physician'::public.web_role]
      WHEN 'dentist' THEN ARRAY['dentist'::public.web_role]
      WHEN 'faculty' THEN ARRAY['admin'::public.web_role, 'nurse'::public.web_role, 'physician'::public.web_role, 'dentist'::public.web_role]
      ELSE NULL
    END;

    PERFORM public.create_staff_notifications(
      'announcement',
      'New announcement',
      COALESCE(NEW.title, 'A clinic notice was published'),
      '/announcements',
      roles,
      jsonb_build_object('announcement_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.announcements.audience IS
  'Target audience: All, Student, Dentist, Physician, Nurse, Faculty, or Employee (Student/Faculty/Employee reserved for patient app).';
