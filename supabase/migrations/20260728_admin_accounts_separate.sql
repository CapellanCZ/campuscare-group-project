-- Separate platform admins from clinic staff memberships.

CREATE TABLE IF NOT EXISTS public.admin_accounts (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_accounts IS
  'Platform admins (CampusCare operators). Separate from clinic_members staff.';

INSERT INTO public.admin_accounts (profile_id, is_active)
SELECT p.id, COALESCE(p.is_active, true)
FROM public.profiles p
WHERE p.primary_role = 'admin'::public.web_role
ON CONFLICT (profile_id) DO UPDATE
SET
  is_active = EXCLUDED.is_active,
  updated_at = now();

DELETE FROM public.clinic_members
WHERE member_role = 'admin'::public.web_role
   OR profile_id IN (SELECT profile_id FROM public.admin_accounts);

CREATE OR REPLACE FUNCTION public.is_clinic_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_accounts a
    JOIN public.profiles p ON p.id = a.profile_id
    WHERE a.profile_id = (SELECT auth.uid())
      AND COALESCE(a.is_active, true)
      AND COALESCE(p.is_active, true)
      AND p.primary_role = 'admin'::public.web_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.has_active_clinic_membership()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.is_clinic_admin()
    OR EXISTS (
      SELECT 1
      FROM public.clinic_members cm
      JOIN public.profiles p ON p.id = cm.profile_id
      WHERE cm.profile_id = (SELECT auth.uid())
        AND COALESCE(cm.is_active, true)
        AND COALESCE(p.is_active, true)
        AND cm.member_role IN (
          'nurse'::public.web_role,
          'physician'::public.web_role,
          'dentist'::public.web_role,
          'clinic_staff'::public.web_role
        )
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_clinic_member(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_active_clinic_membership();
$function$;

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_accounts_select_admins ON public.admin_accounts;
CREATE POLICY admin_accounts_select_admins
  ON public.admin_accounts
  FOR SELECT
  TO authenticated
  USING (public.is_clinic_admin() OR profile_id = (SELECT auth.uid()));

GRANT SELECT ON public.admin_accounts TO authenticated;
REVOKE ALL ON public.admin_accounts FROM anon;

COMMENT ON FUNCTION public.is_clinic_member(uuid) IS
  'Campus access: admins via admin_accounts, staff via clinic_members.';

CREATE OR REPLACE FUNCTION public.sync_clinic_member_role_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.primary_role IS DISTINCT FROM OLD.primary_role
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN

    IF NEW.primary_role = 'admin'::public.web_role THEN
      DELETE FROM public.clinic_members WHERE profile_id = NEW.id;

      INSERT INTO public.admin_accounts (profile_id, is_active)
      VALUES (NEW.id, COALESCE(NEW.is_active, true))
      ON CONFLICT (profile_id) DO UPDATE
      SET
        is_active = EXCLUDED.is_active,
        updated_at = now();
    ELSE
      DELETE FROM public.admin_accounts WHERE profile_id = NEW.id;

      UPDATE public.clinic_members
      SET
        member_role = NEW.primary_role,
        is_active = COALESCE(NEW.is_active, true),
        updated_at = now()
      WHERE profile_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.is_clinic_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinic_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_clinic_membership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_clinic_membership() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid) TO authenticated;
