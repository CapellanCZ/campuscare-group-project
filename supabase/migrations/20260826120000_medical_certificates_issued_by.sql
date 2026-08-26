-- Scope medical certificates by issuer for physicians/dentists.
-- Nurses and clinic admins retain clinic-wide read access.

ALTER TABLE public.medical_certificates
  ADD COLUMN IF NOT EXISTS issued_by uuid
    REFERENCES public.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS medical_certificates_issued_by_idx
  ON public.medical_certificates (issued_by);

COMMENT ON COLUMN public.medical_certificates.issued_by IS
  'Staff user who issued the certificate; used for physician/dentist isolation.';

DROP POLICY IF EXISTS medical_certificates_select_staff
  ON public.medical_certificates;
DROP POLICY IF EXISTS medical_certificates_insert_staff
  ON public.medical_certificates;
DROP POLICY IF EXISTS medical_certificates_update_staff
  ON public.medical_certificates;
DROP POLICY IF EXISTS medical_certificates_delete_staff
  ON public.medical_certificates;
DROP POLICY IF EXISTS "authenticated read medical certificates"
  ON public.medical_certificates;
DROP POLICY IF EXISTS "authenticated insert medical certificates"
  ON public.medical_certificates;
DROP POLICY IF EXISTS "authenticated update medical certificates"
  ON public.medical_certificates;
DROP POLICY IF EXISTS "authenticated delete medical certificates"
  ON public.medical_certificates;

CREATE POLICY medical_certificates_select_staff
  ON public.medical_certificates
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND (
      issued_by = (SELECT auth.uid())
      OR public.current_profile_role() = 'nurse'::public.web_role
      OR public.is_clinic_admin()
    )
  );

CREATE POLICY medical_certificates_insert_staff
  ON public.medical_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND issued_by = (SELECT auth.uid())
  );

CREATE POLICY medical_certificates_update_staff
  ON public.medical_certificates
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND issued_by = (SELECT auth.uid())
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND issued_by = (SELECT auth.uid())
  );

CREATE POLICY medical_certificates_delete_staff
  ON public.medical_certificates
  FOR DELETE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND issued_by = (SELECT auth.uid())
  );
