-- Add patient to web_role enum (must commit before other migrations use it).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'web_role'
      AND e.enumlabel = 'patient'
  ) THEN
    ALTER TYPE public.web_role ADD VALUE 'patient';
  END IF;
END $$;

COMMENT ON TYPE public.web_role IS
  'Clinic RBAC: admin, nurse, physician, dentist, clinic_staff, queue_display, patient';
