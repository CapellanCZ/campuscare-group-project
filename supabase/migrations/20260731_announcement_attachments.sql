-- Announcement attachments + private storage bucket

CREATE TABLE IF NOT EXISTS public.announcement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements (id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  kind text NOT NULL DEFAULT 'document'
    CHECK (kind = ANY (ARRAY['image'::text, 'document'::text])),
  uploaded_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcement_attachments_announcement_id_idx
  ON public.announcement_attachments (announcement_id);

ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read announcement attachments" ON public.announcement_attachments;
CREATE POLICY "authenticated read announcement attachments"
  ON public.announcement_attachments
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "admin insert announcement attachments" ON public.announcement_attachments;
CREATE POLICY "admin insert announcement attachments"
  ON public.announcement_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

DROP POLICY IF EXISTS "admin update announcement attachments" ON public.announcement_attachments;
CREATE POLICY "admin update announcement attachments"
  ON public.announcement_attachments
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

DROP POLICY IF EXISTS "admin delete announcement attachments" ON public.announcement_attachments;
CREATE POLICY "admin delete announcement attachments"
  ON public.announcement_attachments
  FOR DELETE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_attachments TO authenticated;
REVOKE ALL ON public.announcement_attachments FROM anon;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement-attachments',
  'announcement-attachments',
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

DROP POLICY IF EXISTS "staff read announcement attachment files" ON storage.objects;
CREATE POLICY "staff read announcement attachment files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND public.has_active_clinic_membership()
  );

DROP POLICY IF EXISTS "admin insert announcement attachment files" ON storage.objects;
CREATE POLICY "admin insert announcement attachment files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-attachments'
    AND public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

DROP POLICY IF EXISTS "admin update announcement attachment files" ON storage.objects;
CREATE POLICY "admin update announcement attachment files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  )
  WITH CHECK (
    bucket_id = 'announcement-attachments'
    AND public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

DROP POLICY IF EXISTS "admin delete announcement attachment files" ON storage.objects;
CREATE POLICY "admin delete announcement attachment files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

COMMENT ON TABLE public.announcement_attachments IS
  'Files attached to clinic announcements (images and documents).';
