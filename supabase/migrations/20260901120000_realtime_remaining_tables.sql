-- Publish remaining ops tables for staff realtime subscriptions.
-- Idempotent: skips missing tables and duplicate publication members.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'consultation_requests',
    'notifications',
    'users',
    'clinic_members',
    'admin_accounts',
    'user_preferences'
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
