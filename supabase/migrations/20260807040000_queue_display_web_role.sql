-- Ensure queue_display exists on public.web_role and can be assigned via Auth signup metadata.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Add enum value if missing
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'web_role'
      AND e.enumlabel = 'queue_display'
  ) THEN
    ALTER TYPE public.web_role ADD VALUE 'queue_display';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Auth → public.users: accept queue_display from user metadata
--    (previously only admin/nurse/physician/dentist; else became clinic_staff)
-- ---------------------------------------------------------------------------
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

  IF role_text IN ('admin', 'nurse', 'physician', 'dentist', 'queue_display') THEN
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
        'dentist'::public.web_role,
        'queue_display'::public.web_role
      ) THEN EXCLUDED.primary_role
      ELSE public.users.primary_role
    END,
    updated_at = now();

  RETURN NEW;
END;
$function$;

COMMENT ON TYPE public.web_role IS
  'Clinic web RBAC: admin, nurse, physician, dentist, clinic_staff, queue_display';

-- ---------------------------------------------------------------------------
-- 3) Helper: after creating Auth user, promote + membership (run manually with email)
--    Example is in docs; function below is for SQL Editor convenience.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_queue_display_user(target_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid;
  campus_id uuid := '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b';
BEGIN
  SELECT id INTO uid
  FROM public.users
  WHERE lower(email) = lower(trim(target_email))
  LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'No public.users row for email % — create Auth user first', target_email;
  END IF;

  UPDATE public.users
  SET
    primary_role = 'queue_display'::public.web_role,
    is_active = true,
    invite_pending = false,
    updated_at = now()
  WHERE id = uid;

  -- Sync trigger updates existing membership role; ensure a row exists for display.
  INSERT INTO public.clinic_members (clinic_id, user_id, member_role, is_active)
  VALUES (campus_id, uid, 'queue_display'::public.web_role, true)
  ON CONFLICT (user_id) DO UPDATE
  SET
    clinic_id = EXCLUDED.clinic_id,
    member_role = 'queue_display'::public.web_role,
    is_active = true,
    updated_at = now();

  RETURN uid;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_queue_display_user(text) FROM PUBLIC, anon, authenticated;
-- Run as postgres / dashboard SQL editor only.
