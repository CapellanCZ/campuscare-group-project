-- Allow a logged-in patient to link their auth.users id to the patients row
-- matching their email. Required because patients RLS only allows SELECT when
-- auth_user_id is already set, and UPDATE is staff-only.

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

  IF FOUND THEN
    RETURN v_row;
  END IF;

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

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.claim_my_patient_profile() IS
  'Links auth.uid() to public.patients by matching auth email. Call after patient OTP login.';

REVOKE ALL ON FUNCTION public.claim_my_patient_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_my_patient_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_my_patient_profile() TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS patients_auth_user_id_unique
  ON public.patients (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
