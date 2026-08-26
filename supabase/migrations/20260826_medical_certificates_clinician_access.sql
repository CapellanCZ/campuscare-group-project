-- Allow nurse/physician/dentist to access medical certificates via active staff role
-- even when clinic_members row is missing; backfill memberships.

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
    )
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND COALESCE(u.is_active, true)
        AND u.primary_role IN (
          'nurse'::public.web_role,
          'physician'::public.web_role,
          'dentist'::public.web_role,
          'clinic_staff'::public.web_role
        )
    );
$function$;

INSERT INTO public.clinic_members (clinic_id, user_id, member_role, is_active)
SELECT
  '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'::uuid,
  u.id,
  u.primary_role,
  true
FROM public.users u
WHERE COALESCE(u.is_active, true)
  AND u.primary_role IN (
    'nurse'::public.web_role,
    'physician'::public.web_role,
    'dentist'::public.web_role,
    'clinic_staff'::public.web_role
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.clinic_members cm
    WHERE cm.user_id = u.id
  )
ON CONFLICT DO NOTHING;

-- Replace patient-EXISTS policies (patients RLS could block the subquery)
-- with membership-based access. FK still requires a valid patient_id.
DROP POLICY IF EXISTS "authenticated read medical certificates"
  ON public.medical_certificates;
DROP POLICY IF EXISTS "authenticated insert medical certificates"
  ON public.medical_certificates;
DROP POLICY IF EXISTS "authenticated update medical certificates"
  ON public.medical_certificates;
DROP POLICY IF EXISTS "authenticated delete medical certificates"
  ON public.medical_certificates;
DROP POLICY IF EXISTS medical_certificates_select_staff
  ON public.medical_certificates;
DROP POLICY IF EXISTS medical_certificates_insert_staff
  ON public.medical_certificates;
DROP POLICY IF EXISTS medical_certificates_update_staff
  ON public.medical_certificates;
DROP POLICY IF EXISTS medical_certificates_delete_staff
  ON public.medical_certificates;

CREATE POLICY medical_certificates_select_staff
  ON public.medical_certificates
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

CREATE POLICY medical_certificates_insert_staff
  ON public.medical_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_active_clinic_membership());

CREATE POLICY medical_certificates_update_staff
  ON public.medical_certificates
  FOR UPDATE
  TO authenticated
  USING (public.has_active_clinic_membership())
  WITH CHECK (public.has_active_clinic_membership());

CREATE POLICY medical_certificates_delete_staff
  ON public.medical_certificates
  FOR DELETE
  TO authenticated
  USING (public.has_active_clinic_membership());
