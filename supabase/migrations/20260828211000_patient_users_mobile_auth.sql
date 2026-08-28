-- Mobile patient authentication: patient roster → public.users (primary_role = patient).
-- Requires 20260828210000_patient_web_role_enum.sql (enum value committed separately).
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Helper: email exists on patient roster (clinical or operational)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.email_on_patient_roster(normalized_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patient_records pr
    WHERE lower(btrim(pr.email)) = normalized_email
  )
  OR EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE lower(btrim(p.email)) = normalized_email
  );
$$;

REVOKE ALL ON FUNCTION public.email_on_patient_roster(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.email_on_patient_roster(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Auth → public.users: recognize patient role + roster email match
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
  normalized_email text;
  roster_name text;
BEGIN
  normalized_email := lower(btrim(COALESCE(NEW.email, '')));

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
  ELSIF role_text = 'patient' THEN
    resolved_role := 'patient'::public.web_role;
  ELSIF normalized_email <> ''
    AND public.email_on_patient_roster(normalized_email) THEN
    resolved_role := 'patient'::public.web_role;
  ELSE
    resolved_role := 'clinic_staff'::public.web_role;
  END IF;

  resolved_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
    'Staff user'
  );

  IF resolved_role = 'patient'::public.web_role AND normalized_email <> '' THEN
    SELECT COALESCE(
      (
        SELECT NULLIF(trim(concat_ws(' ', pr.first_name, pr.last_name)), '')
        FROM public.patient_records pr
        WHERE lower(btrim(pr.email)) = normalized_email
        ORDER BY pr.updated_at DESC NULLS LAST
        LIMIT 1
      ),
      (
        SELECT NULLIF(trim(p.full_name), '')
        FROM public.patients p
        WHERE lower(btrim(p.email)) = normalized_email
        ORDER BY p.updated_at DESC NULLS LAST
        LIMIT 1
      )
    )
    INTO roster_name;

    resolved_name := COALESCE(NULLIF(trim(roster_name), ''), resolved_name);
  END IF;

  INSERT INTO public.users (id, full_name, email, primary_role, is_active, invite_pending)
  VALUES (
    NEW.id,
    resolved_name,
    NEW.email,
    resolved_role,
    true,
    CASE WHEN resolved_role = 'patient'::public.web_role THEN false ELSE true END
  )
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
        'queue_display'::public.web_role,
        'patient'::public.web_role
      ) THEN EXCLUDED.primary_role
      ELSE public.users.primary_role
    END,
    updated_at = now();

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3) Patients skip clinic membership when role changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_clinic_member_role_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.primary_role IS DISTINCT FROM OLD.primary_role
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN

    IF NEW.primary_role = 'patient'::public.web_role THEN
      DELETE FROM public.admin_accounts WHERE user_id = NEW.id;
      DELETE FROM public.clinic_members WHERE user_id = NEW.id;
    ELSIF NEW.primary_role = 'admin'::public.web_role THEN
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

-- ---------------------------------------------------------------------------
-- 4) claim_my_patient_profile: link patients row + ensure public.users patient row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_my_patient_profile()
RETURNS public.patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_row public.patients;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL OR btrim(v_email) = '' THEN
    RAISE EXCEPTION 'Authenticated user has no email';
  END IF;

  SELECT * INTO v_row
  FROM public.patients p
  WHERE p.auth_user_id = v_uid
  LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.patients p
    SET
      auth_user_id = v_uid,
      updated_at = now()
    WHERE lower(btrim(p.email)) = v_email
      AND p.auth_user_id IS NULL
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
      IF EXISTS (
        SELECT 1
        FROM public.patients p
        WHERE lower(btrim(p.email)) = v_email
      ) THEN
        RAISE EXCEPTION 'Patient record is already linked to another account';
      END IF;
      RAISE EXCEPTION 'No patient record found for this email. Ask the clinic to import your roster.';
    END IF;
  END IF;

  SELECT COALESCE(
    NULLIF(trim(v_row.full_name), ''),
    NULLIF(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''),
    NULLIF(trim(SPLIT_PART(v_email, '@', 1)), ''),
    'Patient'
  )
  INTO v_name
  FROM (
    SELECT first_name, last_name
    FROM public.patient_records pr
    WHERE lower(btrim(pr.email)) = v_email
       OR (v_row.student_id IS NOT NULL AND pr.student_id = v_row.student_id)
       OR (v_row.employee_id IS NOT NULL AND pr.employee_id = v_row.employee_id)
    ORDER BY pr.updated_at DESC NULLS LAST
    LIMIT 1
  ) pr;

  IF v_name IS NULL OR btrim(v_name) = '' THEN
    v_name := COALESCE(
      NULLIF(trim(v_row.full_name), ''),
      NULLIF(trim(SPLIT_PART(v_email, '@', 1)), ''),
      'Patient'
    );
  END IF;

  INSERT INTO public.users (id, full_name, email, primary_role, is_active, invite_pending)
  VALUES (v_uid, v_name, v_email, 'patient'::public.web_role, true, false)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(NULLIF(trim(EXCLUDED.full_name), ''), public.users.full_name),
    email = EXCLUDED.email,
    primary_role = CASE
      WHEN public.users.primary_role IN (
        'admin'::public.web_role,
        'nurse'::public.web_role,
        'physician'::public.web_role,
        'dentist'::public.web_role,
        'queue_display'::public.web_role
      ) THEN public.users.primary_role
      ELSE 'patient'::public.web_role
    END,
    invite_pending = false,
    updated_at = now();

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.claim_my_patient_profile() IS
  'Links auth.uid() to public.patients by email and upserts public.users with primary_role = patient.';

-- ---------------------------------------------------------------------------
-- 5) Patients can read their own operational row (mobile)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "patients_select_own" ON public.patients;
CREATE POLICY "patients_select_own"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 6) Backfill: linked patients + roster emails → patient role in public.users
-- ---------------------------------------------------------------------------
INSERT INTO public.users (id, full_name, email, primary_role, is_active, invite_pending)
SELECT
  p.auth_user_id,
  COALESCE(
    NULLIF(trim(p.full_name), ''),
    NULLIF(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''),
    NULLIF(trim(u.email), ''),
    'Patient'
  ),
  lower(btrim(u.email)),
  'patient'::public.web_role,
  true,
  false
FROM public.patients p
JOIN auth.users u ON u.id = p.auth_user_id
LEFT JOIN LATERAL (
  SELECT first_name, last_name
  FROM public.patient_records pr
  WHERE lower(btrim(pr.email)) = lower(btrim(u.email))
     OR (p.student_id IS NOT NULL AND pr.student_id = p.student_id)
     OR (p.employee_id IS NOT NULL AND pr.employee_id = p.employee_id)
  ORDER BY pr.updated_at DESC NULLS LAST
  LIMIT 1
) pr ON true
WHERE p.auth_user_id IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET
  primary_role = CASE
    WHEN public.users.primary_role IN (
      'admin'::public.web_role,
      'nurse'::public.web_role,
      'physician'::public.web_role,
      'dentist'::public.web_role,
      'queue_display'::public.web_role
    ) THEN public.users.primary_role
    ELSE 'patient'::public.web_role
  END,
  full_name = COALESCE(
    NULLIF(trim(EXCLUDED.full_name), ''),
    public.users.full_name
  ),
  invite_pending = false,
  updated_at = now();

UPDATE public.users u
SET
  primary_role = 'patient'::public.web_role,
  invite_pending = false,
  updated_at = now()
WHERE u.primary_role = 'clinic_staff'::public.web_role
  AND EXISTS (
    SELECT 1
    FROM public.patient_records pr
    WHERE lower(btrim(pr.email)) = lower(btrim(u.email))
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.clinic_members cm
    WHERE cm.user_id = u.id
      AND cm.is_active = true
      AND cm.member_role IN (
        'admin'::public.web_role,
        'nurse'::public.web_role,
        'physician'::public.web_role,
        'dentist'::public.web_role,
        'queue_display'::public.web_role
      )
  );

DELETE FROM public.clinic_members cm
USING public.users u
WHERE cm.user_id = u.id
  AND u.primary_role = 'patient'::public.web_role;
