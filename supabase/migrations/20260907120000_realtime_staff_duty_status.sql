-- Publish staff_duty_status for queue display + staff shell realtime.
-- Idempotent: skips missing tables and duplicate publication members.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'staff_duty_status',
    'staff_duty_sessions'
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
