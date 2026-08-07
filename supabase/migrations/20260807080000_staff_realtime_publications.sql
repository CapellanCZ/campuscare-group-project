-- Staff-wide realtime: publish ops tables so staff UIs can subscribe without hard refresh.
-- Idempotent: skips missing tables and duplicate publication members.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'appointments',
    'health_appointments',
    'announcements',
    'announcement_attachments',
    'medical_certificates',
    'clinic_consultation_capacity',
    'clinic_office_hours',
    'doctor_availability',
    'clinic_break_status',
    'staff_break_status'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;

    BEGIN
      EXECUTE format(
        'ALTER TABLE public.%I REPLICA IDENTITY FULL',
        tbl
      );
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        tbl
      );
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
      WHEN undefined_object THEN
        NULL;
    END;
  END LOOP;
END $$;
