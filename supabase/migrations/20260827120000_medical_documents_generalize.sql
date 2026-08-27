-- Generalize medical_certificates into medical documents (multi-type issuance).

ALTER TABLE public.medical_certificates
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'medical_certification',
  ADD COLUMN IF NOT EXISTS consultation_id uuid REFERENCES public.consultations (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_record_id uuid REFERENCES public.patient_records (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS template_version text NOT NULL DEFAULT '1',
  ADD COLUMN IF NOT EXISTS document_file_url text,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS replaces_document_id uuid REFERENCES public.medical_certificates (id) ON DELETE SET NULL;

ALTER TABLE public.medical_certificates
  DROP CONSTRAINT IF EXISTS medical_certificates_status_check;

ALTER TABLE public.medical_certificates
  ADD CONSTRAINT medical_certificates_status_check
  CHECK (status IN ('draft', 'pending', 'issued', 'printed', 'voided'));

ALTER TABLE public.medical_certificates
  DROP CONSTRAINT IF EXISTS medical_certificates_document_type_check;

ALTER TABLE public.medical_certificates
  ADD CONSTRAINT medical_certificates_document_type_check
  CHECK (
    document_type IN (
      'medical_certification',
      'go_home_slip',
      'prescription',
      'nfg_medical_clearance'
    )
  );

CREATE INDEX IF NOT EXISTS medical_certificates_document_type_idx
  ON public.medical_certificates (document_type);

CREATE INDEX IF NOT EXISTS medical_certificates_consultation_id_idx
  ON public.medical_certificates (consultation_id);

CREATE INDEX IF NOT EXISTS medical_certificates_patient_record_id_idx
  ON public.medical_certificates (patient_record_id);

UPDATE public.medical_certificates
SET document_type = 'medical_certification'
WHERE document_type IS NULL OR document_type = '';

UPDATE public.medical_certificates
SET payload = jsonb_build_object(
  'legacyCertificateType', certificate_type,
  'legacyRemarks', remarks
)
WHERE payload = '{}'::jsonb OR payload IS NULL;

COMMENT ON COLUMN public.medical_certificates.document_type IS
  'medical_certification | go_home_slip | prescription | nfg_medical_clearance';

-- Clinic-wide document numbers by prefix (MC, GH, RX, NFG).
CREATE OR REPLACE FUNCTION public.next_medical_document_number(p_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_text text;
  prefix text;
  latest text;
  next_n integer;
  suffix text;
BEGIN
  IF NOT public.has_active_clinic_membership() THEN
    RAISE EXCEPTION 'not authorized to allocate document numbers'
      USING ERRCODE = '42501';
  END IF;

  IF p_prefix IS NULL OR btrim(p_prefix) = '' THEN
    RAISE EXCEPTION 'document prefix is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('medical_documents.' || p_prefix));

  year_text := to_char((timezone('Asia/Manila', now())), 'YYYY');
  prefix := upper(btrim(p_prefix)) || '-' || year_text || '-';

  SELECT mc.certificate_number
  INTO latest
  FROM public.medical_certificates mc
  WHERE mc.certificate_number LIKE prefix || '%'
  ORDER BY mc.certificate_number DESC
  LIMIT 1;

  IF latest IS NULL THEN
    next_n := 1;
  ELSE
    suffix := substring(latest FROM length(prefix) + 1);
    BEGIN
      next_n := suffix::integer + 1;
    EXCEPTION
      WHEN invalid_text_representation THEN
        next_n := 1;
    END;
  END IF;

  IF next_n < 1 THEN
    next_n := 1;
  END IF;

  RETURN prefix || lpad(next_n::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_medical_document_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_medical_document_number(text) TO authenticated;

-- Audit trail for medical documents.
CREATE TABLE IF NOT EXISTS public.medical_document_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.medical_certificates (id) ON DELETE CASCADE,
  event text NOT NULL,
  actor_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  actor_name text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medical_document_audit_document_id_idx
  ON public.medical_document_audit (document_id);

CREATE INDEX IF NOT EXISTS medical_document_audit_created_at_idx
  ON public.medical_document_audit (created_at DESC);

ALTER TABLE public.medical_document_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medical_document_audit_select_staff
  ON public.medical_document_audit;
CREATE POLICY medical_document_audit_select_staff
  ON public.medical_document_audit
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS medical_document_audit_insert_staff
  ON public.medical_document_audit;
CREATE POLICY medical_document_audit_insert_staff
  ON public.medical_document_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_active_clinic_membership());

GRANT SELECT, INSERT ON public.medical_document_audit TO authenticated;
