-- Split license gate (BEFORE) from membership sync (AFTER) so alignment
-- sees the already-updated profiles.primary_role.

CREATE OR REPLACE FUNCTION public.enforce_doctor_license_on_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  lic text;
BEGIN
  IF NEW.primary_role = 'doctor'::public.web_role
     AND NEW.primary_role IS DISTINCT FROM OLD.primary_role THEN
    SELECT license_number INTO lic
    FROM public.staff_profiles
    WHERE profile_id = NEW.id;

    IF lic IS NULL OR TRIM(lic) = '' THEN
      RAISE EXCEPTION 'cannot set primary_role to doctor without staff_profiles.license_number';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_clinic_member_role_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.primary_role IS DISTINCT FROM OLD.primary_role THEN
    UPDATE public.clinic_members
    SET member_role = NEW.primary_role
    WHERE profile_id = NEW.id
      AND member_role IS DISTINCT FROM NEW.primary_role;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_doctor_license_on_role_change ON public.profiles;
CREATE TRIGGER profiles_doctor_license_on_role_change
  BEFORE UPDATE OF primary_role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_doctor_license_on_role_change();

DROP TRIGGER IF EXISTS profiles_sync_clinic_member_role ON public.profiles;
CREATE TRIGGER profiles_sync_clinic_member_role
  AFTER UPDATE OF primary_role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_clinic_member_role_from_profile();

COMMENT ON FUNCTION public.sync_clinic_member_role_from_profile() IS
  'Keeps clinic_members.member_role aligned after profiles.primary_role changes.';
