-- Consultation requests module: requests, timeline, internal notes, attachments, storage

CREATE TABLE IF NOT EXISTS public.consultation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_record_id uuid REFERENCES public.patient_records (id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  student_id text,
  course text,
  year_level text,
  email text,
  phone text,
  service text NOT NULL DEFAULT 'General consultation',
  preferred_date date,
  preferred_time text,
  reason text NOT NULL DEFAULT '',
  symptoms text,
  additional_notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY[
      'pending'::text,
      'approved'::text,
      'declined'::text,
      'rescheduled'::text,
      'completed'::text,
      'cancelled'::text
    ])),
  assigned_nurse_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  assigned_doctor_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  assigned_nurse_name text,
  assigned_doctor_name text,
  consultation_room text,
  schedule_at timestamptz,
  decline_reason text,
  reschedule_reason text,
  approval_notes text,
  queue_ticket_id uuid,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_requests_status_idx
  ON public.consultation_requests (status);
CREATE INDEX IF NOT EXISTS consultation_requests_submitted_at_idx
  ON public.consultation_requests (submitted_at DESC);
CREATE INDEX IF NOT EXISTS consultation_requests_student_id_idx
  ON public.consultation_requests (student_id);
CREATE INDEX IF NOT EXISTS consultation_requests_patient_record_id_idx
  ON public.consultation_requests (patient_record_id);

CREATE OR REPLACE FUNCTION public.set_consultation_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consultation_requests_set_updated_at ON public.consultation_requests;
CREATE TRIGGER consultation_requests_set_updated_at
  BEFORE UPDATE ON public.consultation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_consultation_requests_updated_at();

CREATE TABLE IF NOT EXISTS public.consultation_request_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.consultation_requests (id) ON DELETE CASCADE,
  action text NOT NULL,
  remarks text,
  actor_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_request_timeline_request_id_idx
  ON public.consultation_request_timeline (request_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.consultation_request_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.consultation_requests (id) ON DELETE CASCADE,
  body text NOT NULL,
  author_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_request_notes_request_id_idx
  ON public.consultation_request_notes (request_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_consultation_request_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consultation_request_notes_set_updated_at ON public.consultation_request_notes;
CREATE TRIGGER consultation_request_notes_set_updated_at
  BEFORE UPDATE ON public.consultation_request_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_consultation_request_notes_updated_at();

CREATE TABLE IF NOT EXISTS public.consultation_request_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.consultation_requests (id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  category text NOT NULL DEFAULT 'other'
    CHECK (category = ANY (ARRAY[
      'image'::text,
      'medical_certificate'::text,
      'lab_result'::text,
      'referral'::text,
      'other'::text
    ])),
  uploaded_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_request_attachments_request_id_idx
  ON public.consultation_request_attachments (request_id);

CREATE TABLE IF NOT EXISTS public.consultation_request_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.consultation_requests (id) ON DELETE CASCADE,
  event text NOT NULL,
  actor_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  actor_name text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultation_request_audit_request_id_idx
  ON public.consultation_request_audit (request_id, created_at ASC);

ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_request_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_request_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_request_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read consultation requests" ON public.consultation_requests;
CREATE POLICY "staff read consultation requests"
  ON public.consultation_requests FOR SELECT TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff write consultation requests" ON public.consultation_requests;
CREATE POLICY "staff write consultation requests"
  ON public.consultation_requests FOR ALL TO authenticated
  USING (public.has_active_clinic_membership())
  WITH CHECK (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff read consultation request timeline" ON public.consultation_request_timeline;
CREATE POLICY "staff read consultation request timeline"
  ON public.consultation_request_timeline FOR SELECT TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff write consultation request timeline" ON public.consultation_request_timeline;
CREATE POLICY "staff write consultation request timeline"
  ON public.consultation_request_timeline FOR ALL TO authenticated
  USING (public.has_active_clinic_membership())
  WITH CHECK (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff read consultation request notes" ON public.consultation_request_notes;
CREATE POLICY "staff read consultation request notes"
  ON public.consultation_request_notes FOR SELECT TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff write consultation request notes" ON public.consultation_request_notes;
CREATE POLICY "staff write consultation request notes"
  ON public.consultation_request_notes FOR ALL TO authenticated
  USING (public.has_active_clinic_membership())
  WITH CHECK (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff read consultation request attachments" ON public.consultation_request_attachments;
CREATE POLICY "staff read consultation request attachments"
  ON public.consultation_request_attachments FOR SELECT TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff write consultation request attachments" ON public.consultation_request_attachments;
CREATE POLICY "staff write consultation request attachments"
  ON public.consultation_request_attachments FOR ALL TO authenticated
  USING (public.has_active_clinic_membership())
  WITH CHECK (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff read consultation request audit" ON public.consultation_request_audit;
CREATE POLICY "staff read consultation request audit"
  ON public.consultation_request_audit FOR SELECT TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff write consultation request audit" ON public.consultation_request_audit;
CREATE POLICY "staff write consultation request audit"
  ON public.consultation_request_audit FOR ALL TO authenticated
  USING (public.has_active_clinic_membership())
  WITH CHECK (public.has_active_clinic_membership());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_request_timeline TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_request_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_request_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_request_audit TO authenticated;
REVOKE ALL ON public.consultation_requests FROM anon;
REVOKE ALL ON public.consultation_request_timeline FROM anon;
REVOKE ALL ON public.consultation_request_notes FROM anon;
REVOKE ALL ON public.consultation_request_attachments FROM anon;
REVOKE ALL ON public.consultation_request_audit FROM anon;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'consultation-request-attachments',
  'consultation-request-attachments',
  false,
  15728640,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "staff read consultation request files" ON storage.objects;
CREATE POLICY "staff read consultation request files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'consultation-request-attachments'
    AND public.has_active_clinic_membership()
  );

DROP POLICY IF EXISTS "staff write consultation request files" ON storage.objects;
CREATE POLICY "staff write consultation request files"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'consultation-request-attachments'
    AND public.has_active_clinic_membership()
  )
  WITH CHECK (
    bucket_id = 'consultation-request-attachments'
    AND public.has_active_clinic_membership()
  );

COMMENT ON TABLE public.consultation_requests IS
  'Student/staff consultation requests triaged by clinic nurses.';
