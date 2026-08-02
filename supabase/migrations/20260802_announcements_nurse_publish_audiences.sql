-- Nurse may publish/edit/delete announcements (with admin).
-- Normalize audiences to All / Dentist / Physician / Nurse / Faculty.
-- Lazy auto-publish for due scheduled rows via SECURITY DEFINER RPC.

UPDATE public.announcements
SET audience = CASE audience
  WHEN 'All students' THEN 'All'
  WHEN 'All campus' THEN 'All'
  WHEN 'Clinic staff' THEN 'All'
  WHEN 'Dental queue' THEN 'Dentist'
  WHEN 'Physician queue' THEN 'Physician'
  ELSE audience
END
WHERE audience IN (
  'All students',
  'All campus',
  'Clinic staff',
  'Dental queue',
  'Physician queue'
);

ALTER TABLE public.announcements
  ALTER COLUMN audience SET DEFAULT 'All';

COMMENT ON TABLE public.announcements IS
  'Clinic notices. Admin and nurse write; staff read. Audiences: All, Dentist, Physician, Nurse, Faculty.';

-- Announcements write: admin or nurse
DROP POLICY IF EXISTS "admin insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "admin update announcements" ON public.announcements;
DROP POLICY IF EXISTS "admin delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "staff insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "staff update announcements" ON public.announcements;
DROP POLICY IF EXISTS "staff delete announcements" ON public.announcements;

CREATE POLICY "staff insert announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        clinic_id,
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  );

CREATE POLICY "staff update announcements"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        clinic_id,
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        clinic_id,
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  );

CREATE POLICY "staff delete announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        clinic_id,
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  );

-- Attachments write: admin or nurse
DROP POLICY IF EXISTS "admin insert announcement attachments" ON public.announcement_attachments;
DROP POLICY IF EXISTS "admin update announcement attachments" ON public.announcement_attachments;
DROP POLICY IF EXISTS "admin delete announcement attachments" ON public.announcement_attachments;
DROP POLICY IF EXISTS "staff insert announcement attachments" ON public.announcement_attachments;
DROP POLICY IF EXISTS "staff update announcement attachments" ON public.announcement_attachments;
DROP POLICY IF EXISTS "staff delete announcement attachments" ON public.announcement_attachments;

CREATE POLICY "staff insert announcement attachments"
  ON public.announcement_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        (SELECT a.clinic_id FROM public.announcements a WHERE a.id = announcement_id),
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  );

CREATE POLICY "staff update announcement attachments"
  ON public.announcement_attachments
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        (SELECT a.clinic_id FROM public.announcements a WHERE a.id = announcement_id),
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        (SELECT a.clinic_id FROM public.announcements a WHERE a.id = announcement_id),
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  );

CREATE POLICY "staff delete announcement attachments"
  ON public.announcement_attachments
  FOR DELETE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        (SELECT a.clinic_id FROM public.announcements a WHERE a.id = announcement_id),
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  );

-- Storage write: admin or nurse
DROP POLICY IF EXISTS "admin insert announcement attachment files" ON storage.objects;
DROP POLICY IF EXISTS "admin update announcement attachment files" ON storage.objects;
DROP POLICY IF EXISTS "admin delete announcement attachment files" ON storage.objects;
DROP POLICY IF EXISTS "staff insert announcement attachment files" ON storage.objects;
DROP POLICY IF EXISTS "staff update announcement attachment files" ON storage.objects;
DROP POLICY IF EXISTS "staff delete announcement attachment files" ON storage.objects;

CREATE POLICY "staff insert announcement attachment files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-attachments'
    AND public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        NULL,
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  );

CREATE POLICY "staff update announcement attachment files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        NULL,
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  )
  WITH CHECK (
    bucket_id = 'announcement-attachments'
    AND public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        NULL,
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  );

CREATE POLICY "staff delete announcement attachment files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'announcement-attachments'
    AND public.has_active_clinic_membership()
    AND (
      public.is_clinic_admin()
      OR public.has_clinic_role(
        NULL,
        ARRAY['admin'::public.web_role, 'nurse'::public.web_role]
      )
    )
  );

CREATE OR REPLACE FUNCTION public.promote_due_announcements()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.announcements
  SET
    status = 'published',
    published_at = COALESCE(published_at, now()),
    updated_at = now()
  WHERE status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= now();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_due_announcements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_due_announcements() TO authenticated;

COMMENT ON FUNCTION public.promote_due_announcements() IS
  'Promote scheduled announcements whose scheduled_at has passed. Callable by any authenticated staff.';
