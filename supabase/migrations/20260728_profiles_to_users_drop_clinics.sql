-- Applied remotely via Supabase MCP to CampusCare (zrteblltvshgcienhytm).
-- Combines: drop_staff_profiles, rename_profiles_to_users,
-- rename_profile_id_to_user_id, drop_clinics_update_functions.

-- ============================================================
-- 1) Drop unused staff_profiles + doctor-license machinery
-- ============================================================
DROP TRIGGER IF EXISTS staff_profiles_doctor_license ON public.staff_profiles;
DROP TRIGGER IF EXISTS staff_profiles_set_updated_at ON public.staff_profiles;
DROP TRIGGER IF EXISTS profiles_doctor_license_on_role_change ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_doctor_license();
DROP FUNCTION IF EXISTS public.enforce_doctor_license_on_role_change();
DROP TABLE IF EXISTS public.staff_profiles CASCADE;

-- ============================================================
-- 2) Rename profiles → users
-- ============================================================
ALTER TABLE public.profiles RENAME TO users;

ALTER TABLE public.users RENAME CONSTRAINT profiles_pkey TO users_pkey;
ALTER TABLE public.users RENAME CONSTRAINT profiles_email_key TO users_email_key;
ALTER TABLE public.users RENAME CONSTRAINT profiles_id_fkey TO users_id_fkey;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_sync_clinic_member_role ON public.users;

DROP POLICY IF EXISTS profiles_select_own ON public.users;
DROP POLICY IF EXISTS profiles_select_campus_staff ON public.users;
DROP POLICY IF EXISTS profiles_update_own_safe_fields ON public.users;

CREATE POLICY users_select_own
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY users_select_campus_staff
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND primary_role = ANY (ARRAY[
      'admin'::public.web_role,
      'nurse'::public.web_role,
      'physician'::public.web_role,
      'dentist'::public.web_role,
      'clinic_staff'::public.web_role
    ])
  );

CREATE POLICY users_update_own_safe_fields
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND email = (SELECT u.email FROM public.users u WHERE u.id = (SELECT auth.uid()))
    AND primary_role = (SELECT u.primary_role FROM public.users u WHERE u.id = (SELECT auth.uid()))
    AND is_active = (SELECT u.is_active FROM public.users u WHERE u.id = (SELECT auth.uid()))
    AND (
      invite_pending = false
      OR invite_pending = (SELECT u.invite_pending FROM public.users u WHERE u.id = (SELECT auth.uid()))
    )
  );

COMMENT ON TABLE public.users IS 'App staff identity (mirrors auth.users). Not auth.users.';

-- ============================================================
-- 3) Rename profile_id → user_id
-- ============================================================
ALTER TABLE public.admin_accounts RENAME COLUMN profile_id TO user_id;
ALTER TABLE public.admin_accounts DROP CONSTRAINT IF EXISTS admin_accounts_profile_id_fkey;
ALTER TABLE public.admin_accounts
  ADD CONSTRAINT admin_accounts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;

DROP POLICY IF EXISTS admin_accounts_select_admins ON public.admin_accounts;
CREATE POLICY admin_accounts_select_admins
  ON public.admin_accounts
  FOR SELECT
  TO authenticated
  USING (public.is_clinic_admin() OR user_id = (SELECT auth.uid()));

ALTER TABLE public.clinic_members DROP CONSTRAINT IF EXISTS clinic_members_clinic_id_fkey;
ALTER TABLE public.clinic_members DROP CONSTRAINT IF EXISTS clinic_members_pkey;
ALTER TABLE public.clinic_members DROP CONSTRAINT IF EXISTS clinic_members_profile_id_fkey;

ALTER TABLE public.clinic_members RENAME COLUMN profile_id TO user_id;

DELETE FROM public.clinic_members cm
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM public.clinic_members
  GROUP BY user_id
);

ALTER TABLE public.clinic_members
  ADD CONSTRAINT clinic_members_pkey PRIMARY KEY (user_id);

ALTER TABLE public.clinic_members
  ADD CONSTRAINT clinic_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;

DROP INDEX IF EXISTS clinic_members_profile_id_idx;
CREATE INDEX IF NOT EXISTS clinic_members_user_id_idx ON public.clinic_members (user_id);

DROP POLICY IF EXISTS clinic_members_select_own ON public.clinic_members;
CREATE POLICY clinic_members_select_own
  ON public.clinic_members
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.has_active_clinic_membership());

-- ============================================================
-- 4) Drop clinics catalog + update helpers
-- ============================================================
DROP POLICY IF EXISTS clinics_select_authenticated ON public.clinics;
DROP TABLE IF EXISTS public.clinics CASCADE;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.web_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT primary_role
  FROM public.users
  WHERE id = auth.uid() AND is_active = true
$function$;

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
    JOIN public.users u ON u.id = a.user_id
    WHERE a.user_id = (SELECT auth.uid())
      AND COALESCE(a.is_active, true)
      AND COALESCE(u.is_active, true)
      AND u.primary_role = 'admin'::public.web_role
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
      JOIN public.users u ON u.id = cm.user_id
      WHERE cm.user_id = (SELECT auth.uid())
        AND COALESCE(cm.is_active, true)
        AND COALESCE(u.is_active, true)
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

CREATE OR REPLACE FUNCTION public.has_clinic_role(target_clinic_id uuid, allowed_roles public.web_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members
    WHERE user_id = (SELECT auth.uid())
      AND is_active = true
      AND member_role = ANY (allowed_roles)
  )
  OR (
    public.is_clinic_admin()
    AND 'admin'::public.web_role = ANY (allowed_roles)
  );
$function$;

CREATE OR REPLACE FUNCTION public.my_clinic_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT clinic_id
  FROM public.clinic_members
  WHERE user_id = auth.uid() AND is_active = true AND clinic_id IS NOT NULL
$function$;

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
      DELETE FROM public.clinic_members WHERE user_id = NEW.id;

      INSERT INTO public.admin_accounts (user_id, is_active)
      VALUES (NEW.id, COALESCE(NEW.is_active, true))
      ON CONFLICT (user_id) DO UPDATE
      SET
        is_active = EXCLUDED.is_active,
        updated_at = now();
    ELSE
      DELETE FROM public.admin_accounts WHERE user_id = NEW.id;

      UPDATE public.clinic_members
      SET
        member_role = NEW.primary_role,
        is_active = COALESCE(NEW.is_active, true),
        updated_at = now()
      WHERE user_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS users_sync_clinic_member_role ON public.users;
CREATE TRIGGER users_sync_clinic_member_role
  AFTER UPDATE OF primary_role, is_active ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_clinic_member_role_from_profile();

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.users
    SET email = NEW.email
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  role_text text;
  resolved_role public.web_role;
  resolved_name text;
BEGIN
  role_text := lower(trim(COALESCE(
    NEW.raw_app_meta_data ->> 'primary_role',
    NEW.raw_user_meta_data ->> 'primary_role',
    ''
  )));

  IF role_text = 'doctor' THEN
    role_text := 'physician';
  END IF;

  IF role_text IN ('admin', 'nurse', 'physician', 'dentist') THEN
    resolved_role := role_text::public.web_role;
  ELSE
    resolved_role := 'clinic_staff'::public.web_role;
  END IF;

  resolved_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
    'Staff user'
  );

  INSERT INTO public.users (id, full_name, email, primary_role, is_active, invite_pending)
  VALUES (NEW.id, resolved_name, NEW.email, resolved_role, true, true)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    primary_role = CASE
      WHEN EXCLUDED.primary_role IN (
        'admin'::public.web_role,
        'nurse'::public.web_role,
        'physician'::public.web_role,
        'dentist'::public.web_role
      ) THEN EXCLUDED.primary_role
      ELSE public.users.primary_role
    END,
    updated_at = now();

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_clinic_member_role_alignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  user_role public.web_role;
BEGIN
  SELECT primary_role INTO user_role
  FROM public.users
  WHERE id = NEW.user_id;

  IF user_role IS NULL THEN
    RAISE EXCEPTION 'user % not found', NEW.user_id;
  END IF;

  IF NEW.member_role IS DISTINCT FROM user_role THEN
    RAISE EXCEPTION 'clinic_members.member_role (%) must equal users.primary_role (%)',
      NEW.member_role, user_role;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bootstrap_clinic_admin(target_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid
  FROM public.users
  WHERE lower(email) = lower(target_email)
  LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'no user for email % — sign in once first', target_email;
  END IF;

  UPDATE public.users
  SET primary_role = 'admin'::public.web_role,
      is_active = true,
      full_name = COALESCE(NULLIF(TRIM(full_name), ''), 'Clinic Admin')
  WHERE id = uid;

  DELETE FROM public.clinic_members WHERE user_id = uid;

  INSERT INTO public.admin_accounts (user_id, is_active)
  VALUES (uid, true)
  ON CONFLICT (user_id) DO UPDATE
  SET is_active = true, updated_at = now();

  RETURN uid;
END;
$function$;

COMMENT ON FUNCTION public.is_clinic_member(uuid) IS
  'Campus access: admins via admin_accounts, staff via clinic_members.';

REVOKE EXECUTE ON FUNCTION public.is_clinic_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinic_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_clinic_membership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_clinic_membership() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid) TO authenticated;
