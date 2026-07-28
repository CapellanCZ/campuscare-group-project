-- Harden medical certificate RLS and trigger search_path.
-- Safe to apply after 20260727_medical_certificates.

CREATE OR REPLACE FUNCTION public.set_medical_certificates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "authenticated read medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated read medical certificates"
  ON public.medical_certificates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
        AND public.is_clinic_member(p.clinic_id)
    )
  );

DROP POLICY IF EXISTS "authenticated insert medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated insert medical certificates"
  ON public.medical_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
        AND public.is_clinic_member(p.clinic_id)
    )
  );

DROP POLICY IF EXISTS "authenticated update medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated update medical certificates"
  ON public.medical_certificates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
        AND public.is_clinic_member(p.clinic_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
        AND public.is_clinic_member(p.clinic_id)
    )
  );

DROP POLICY IF EXISTS "authenticated delete medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated delete medical certificates"
  ON public.medical_certificates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
        AND public.is_clinic_member(p.clinic_id)
    )
  );
