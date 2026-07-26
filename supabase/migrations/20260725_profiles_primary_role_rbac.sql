-- Clinic web RBAC: primary_role drives which staff shell a user may enter.
DO $$ BEGIN
  CREATE TYPE public.web_role AS ENUM (
    'admin',
    'nurse',
    'physician',
    'dentist',
    'queue_display'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_role public.web_role;

COMMENT ON COLUMN public.profiles.primary_role IS
  'CampusCare clinic web RBAC role; drives /admin|/nurse|/physician|/dentist|/queue-management routing.';

UPDATE public.profiles p
SET primary_role = p.designation::public.web_role
WHERE p.primary_role IS NULL
  AND p.designation IN ('admin', 'nurse', 'physician', 'dentist', 'queue_display');

UPDATE public.profiles p
SET designation = p.primary_role::text
WHERE p.primary_role IS NOT NULL
  AND (p.designation IS DISTINCT FROM p.primary_role::text);

CREATE OR REPLACE FUNCTION public.sync_profile_primary_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.primary_role IS NOT NULL THEN
    NEW.designation := NEW.primary_role::text;
  ELSIF NEW.designation IN ('admin', 'nurse', 'physician', 'dentist', 'queue_display') THEN
    NEW.primary_role := NEW.designation::public.web_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_primary_role ON public.profiles;
CREATE TRIGGER trg_sync_profile_primary_role
  BEFORE INSERT OR UPDATE OF primary_role, designation
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_primary_role();
