-- Medical certificates issued by clinic staff for enrolled patients.

CREATE TABLE IF NOT EXISTS public.medical_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  certificate_number text NOT NULL,
  certificate_type text NOT NULL,
  purpose text,
  doctor_name text,
  remarks text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'issued', 'printed')),
  issued_at timestamptz,
  valid_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medical_certificates_certificate_number_key UNIQUE (certificate_number)
);

CREATE INDEX IF NOT EXISTS medical_certificates_patient_id_idx
  ON public.medical_certificates (patient_id);

CREATE INDEX IF NOT EXISTS medical_certificates_status_idx
  ON public.medical_certificates (status);

CREATE INDEX IF NOT EXISTS medical_certificates_issued_at_idx
  ON public.medical_certificates (issued_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS medical_certificates_certificate_type_idx
  ON public.medical_certificates (certificate_type);

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

DROP TRIGGER IF EXISTS medical_certificates_set_updated_at ON public.medical_certificates;
CREATE TRIGGER medical_certificates_set_updated_at
  BEFORE UPDATE ON public.medical_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_medical_certificates_updated_at();

ALTER TABLE public.medical_certificates ENABLE ROW LEVEL SECURITY;

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_certificates TO authenticated;
REVOKE ALL ON public.medical_certificates FROM anon;
