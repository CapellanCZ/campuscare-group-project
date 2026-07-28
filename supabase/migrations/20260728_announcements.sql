-- Clinic announcements for staff publishing and internal visibility.
-- Bootstraps clinic catalog helpers when missing (single-campus deployments).

CREATE TABLE IF NOT EXISTS public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'CampusCare Clinic',
  slug text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.clinics (name, slug, is_active)
SELECT
  'NU Dasmarinas Health Services Office',
  'nu-dasma-hso',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.clinics);

CREATE TABLE IF NOT EXISTS public.clinic_members (
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  -- Prefer web_role when the enum already exists; text fallback for fresh installs.
  member_role text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, profile_id)
);

CREATE INDEX IF NOT EXISTS clinic_members_profile_id_idx
  ON public.clinic_members (profile_id);

DROP FUNCTION IF EXISTS public.is_clinic_admin();

CREATE OR REPLACE FUNCTION public.is_clinic_member(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members cm
    WHERE cm.clinic_id = target_clinic_id
      AND cm.profile_id = (SELECT auth.uid())
      AND COALESCE(cm.is_active, true)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_primary_role boolean;
  has_designation boolean;
  has_is_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'primary_role'
  ) INTO has_primary_role;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'designation'
  ) INTO has_designation;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_active'
  ) INTO has_is_active;

  IF has_primary_role THEN
    IF has_is_active THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = (SELECT auth.uid())
          AND COALESCE(p.is_active, true)
          AND p.primary_role::text = 'admin'
      );
    END IF;

    RETURN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.primary_role::text = 'admin'
    );
  END IF;

  IF has_designation THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.designation = 'admin'
    );
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT 'All students',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'published')),
  author_id uuid NOT NULL REFERENCES public.profiles (id),
  published_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
  USING (public.is_clinic_member(clinic_id));

DROP POLICY IF EXISTS "admin insert announcements" ON public.announcements;
CREATE POLICY "admin insert announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_clinic_member(clinic_id)
    AND public.is_clinic_admin()
  );

DROP POLICY IF EXISTS "admin update announcements" ON public.announcements;
CREATE POLICY "admin update announcements"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    public.is_clinic_member(clinic_id)
    AND public.is_clinic_admin()
  )
  WITH CHECK (
    public.is_clinic_member(clinic_id)
    AND public.is_clinic_admin()
  );

DROP POLICY IF EXISTS "admin delete announcements" ON public.announcements;
CREATE POLICY "admin delete announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    public.is_clinic_member(clinic_id)
    AND public.is_clinic_admin()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
REVOKE ALL ON public.announcements FROM anon;

-- Backfill clinic membership for staff profiles when the table is new/empty.
DO $$
DECLARE
  member_role_udt text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'primary_role'
  ) THEN
    RETURN;
  END IF;

  SELECT c.udt_name
  INTO member_role_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'clinic_members'
    AND c.column_name = 'member_role';

  IF member_role_udt = 'web_role' THEN
    INSERT INTO public.clinic_members (clinic_id, profile_id, member_role, is_active)
    SELECT
      c.id,
      p.id,
      p.primary_role::public.web_role,
      true
    FROM public.profiles p
    CROSS JOIN LATERAL (
      SELECT id FROM public.clinics ORDER BY created_at ASC NULLS LAST LIMIT 1
    ) c
    WHERE p.primary_role IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.clinic_members cm WHERE cm.profile_id = p.id
      )
    ON CONFLICT (clinic_id, profile_id) DO NOTHING;
  ELSE
    INSERT INTO public.clinic_members (clinic_id, profile_id, member_role, is_active)
    SELECT
      c.id,
      p.id,
      p.primary_role::text,
      true
    FROM public.profiles p
    CROSS JOIN LATERAL (
      SELECT id FROM public.clinics ORDER BY created_at ASC NULLS LAST LIMIT 1
    ) c
    WHERE p.primary_role IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.clinic_members cm WHERE cm.profile_id = p.id
      )
    ON CONFLICT (clinic_id, profile_id) DO NOTHING;
  END IF;
END $$;
