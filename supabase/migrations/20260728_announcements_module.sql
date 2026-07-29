-- Document announcements for local/CI parity with the live CampusCare schema.
-- Table may already exist remotely; create only if missing and harden grants/RLS.

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT 'All students',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'published'::text])),
  author_id uuid NOT NULL,
  published_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clinics'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'announcements_clinic_id_fkey'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_clinic_id_fkey
      FOREIGN KEY (clinic_id) REFERENCES public.clinics (id) ON DELETE RESTRICT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'announcements_author_id_fkey'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public.users (id) ON DELETE RESTRICT;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'announcements_author_id_fkey'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles (id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS announcements_clinic_id_idx
  ON public.announcements (clinic_id);

CREATE INDEX IF NOT EXISTS announcements_status_idx
  ON public.announcements (status);

CREATE INDEX IF NOT EXISTS announcements_updated_at_idx
  ON public.announcements (updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_announcements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcements_set_updated_at ON public.announcements;
CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_announcements_updated_at();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read announcements" ON public.announcements;
CREATE POLICY "authenticated read announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "admin insert announcements" ON public.announcements;
CREATE POLICY "admin insert announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

DROP POLICY IF EXISTS "admin update announcements" ON public.announcements;
CREATE POLICY "admin update announcements"
  ON public.announcements
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

DROP POLICY IF EXISTS "admin delete announcements" ON public.announcements;
CREATE POLICY "admin delete announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND public.is_clinic_admin()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
REVOKE ALL ON public.announcements FROM anon;

COMMENT ON TABLE public.announcements IS
  'Clinic notices for students and staff. Admin write; staff read.';
