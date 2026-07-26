-- Staff invite / RBAC integrity:
-- 1) Auth trigger accepts clinic web roles (nurse/physician/dentist/admin)
-- 2) Prefer app_metadata for role (user_metadata is user-editable)
-- 3) Map legacy doctor → physician
-- 4) Backfill clinic_members so RLS helpers work
-- 5) Allow members to select their own membership rows

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  role_text text;
  resolved_role public.web_role;
  resolved_name text;
BEGIN
  -- Prefer app_metadata (server-controlled) over user_metadata (user-editable).
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
    -- Unknown invites stay non-web until an admin upserts a managed role.
    resolved_role := 'clinic_staff'::public.web_role;
  END IF;

  resolved_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
    'Staff user'
  );

  INSERT INTO public.profiles (id, full_name, email, primary_role, is_active)
  VALUES (NEW.id, resolved_name, NEW.email, resolved_role, true)
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
      ELSE public.profiles.primary_role
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Normalize legacy doctor profiles to physician (app RBAC role).
UPDATE public.profiles
SET primary_role = 'physician'::public.web_role,
    updated_at = now()
WHERE primary_role = 'doctor'::public.web_role;

-- Backfill active clinic membership for every profile (required for RLS).
INSERT INTO public.clinic_members (clinic_id, profile_id, member_role, is_active)
SELECT
  c.id,
  p.id,
  CASE
    WHEN p.primary_role = 'doctor'::public.web_role THEN 'physician'::public.web_role
    WHEN p.primary_role IN (
      'admin'::public.web_role,
      'nurse'::public.web_role,
      'physician'::public.web_role,
      'dentist'::public.web_role
    ) THEN p.primary_role
    ELSE 'clinic_staff'::public.web_role
  END,
  p.is_active
FROM public.profiles p
CROSS JOIN LATERAL (
  SELECT id FROM public.clinics ORDER BY created_at ASC NULLS LAST LIMIT 1
) c
ON CONFLICT (clinic_id, profile_id) DO UPDATE
SET
  member_role = EXCLUDED.member_role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Own-row select: avoids depending only on same-clinic join for access checks.
DROP POLICY IF EXISTS clinic_members_select_own ON public.clinic_members;
CREATE POLICY clinic_members_select_own
  ON public.clinic_members
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));
