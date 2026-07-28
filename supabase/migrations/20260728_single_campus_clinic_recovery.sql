-- Single-campus clinic recovery:
-- clinic_members / clinics were missing, which broke auth gates and med-cert RLS.
-- Recreate one campus clinic, backfill memberships, and simplify med-cert RLS
-- to active staff membership (one clinic campus).

CREATE TABLE IF NOT EXISTS public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Campus Clinic',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prefer the clinic_id already used by patients/certificates.
INSERT INTO public.clinics (id, name, is_active)
VALUES (
  '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b',
  'NU Dasmariñas Health Services Office',
  true
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = true,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.clinic_members (
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE RESTRICT,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  member_role public.web_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, profile_id)
);

CREATE INDEX IF NOT EXISTS clinic_members_profile_id_idx
  ON public.clinic_members (profile_id);

CREATE INDEX IF NOT EXISTS clinic_members_clinic_id_idx
  ON public.clinic_members (clinic_id);

-- One campus clinic for everyone.
UPDATE public.patients
SET clinic_id = '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'
WHERE clinic_id IS DISTINCT FROM '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b';

UPDATE public.appointments
SET clinic_id = '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'
WHERE clinic_id IS DISTINCT FROM '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b';

UPDATE public.consultations
SET clinic_id = '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'
WHERE clinic_id IS DISTINCT FROM '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b';

UPDATE public.announcements
SET clinic_id = '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'
WHERE clinic_id IS DISTINCT FROM '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b';

UPDATE public.doctor_availability
SET clinic_id = '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'
WHERE clinic_id IS DISTINCT FROM '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b';

-- Backfill memberships for all managed staff onto the one campus clinic.
INSERT INTO public.clinic_members (clinic_id, profile_id, member_role, is_active)
SELECT
  '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'::uuid,
  p.id,
  CASE
    WHEN p.primary_role IN (
      'admin'::public.web_role,
      'nurse'::public.web_role,
      'physician'::public.web_role,
      'dentist'::public.web_role
    ) THEN p.primary_role
    ELSE 'clinic_staff'::public.web_role
  END,
  COALESCE(p.is_active, true)
FROM public.profiles p
WHERE p.primary_role IN (
  'admin'::public.web_role,
  'nurse'::public.web_role,
  'physician'::public.web_role,
  'dentist'::public.web_role,
  'clinic_staff'::public.web_role
)
ON CONFLICT (clinic_id, profile_id) DO UPDATE
SET
  member_role = EXCLUDED.member_role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Single-clinic helper: any active membership grants campus access.
-- target_clinic_id is kept for call-site compatibility but ignored.
CREATE OR REPLACE FUNCTION public.is_clinic_member(target_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members cm
    WHERE cm.profile_id = (SELECT auth.uid())
      AND COALESCE(cm.is_active, true)
  );
$function$;

COMMENT ON FUNCTION public.is_clinic_member(uuid) IS
  'Single-campus: any active membership grants access (one clinic).';

CREATE OR REPLACE FUNCTION public.has_active_clinic_membership()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members cm
    JOIN public.profiles p ON p.id = cm.profile_id
    WHERE cm.profile_id = (SELECT auth.uid())
      AND COALESCE(cm.is_active, true)
      AND COALESCE(p.is_active, true)
  );
$function$;

-- Med certs: any active campus staff can read/write (still requires linked patient).
DROP POLICY IF EXISTS "authenticated read medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated read medical certificates"
  ON public.medical_certificates
  FOR SELECT
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
    )
  );

DROP POLICY IF EXISTS "authenticated insert medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated insert medical certificates"
  ON public.medical_certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
    )
  );

DROP POLICY IF EXISTS "authenticated update medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated update medical certificates"
  ON public.medical_certificates
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
    )
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
    )
  );

DROP POLICY IF EXISTS "authenticated delete medical certificates"
  ON public.medical_certificates;
CREATE POLICY "authenticated delete medical certificates"
  ON public.medical_certificates
  FOR DELETE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = medical_certificates.patient_id
    )
  );

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinics_select_authenticated ON public.clinics;
CREATE POLICY clinics_select_authenticated
  ON public.clinics
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS clinic_members_select_own ON public.clinic_members;
CREATE POLICY clinic_members_select_own
  ON public.clinic_members
  FOR SELECT
  TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR public.has_active_clinic_membership()
  );

GRANT SELECT ON public.clinics TO authenticated;
GRANT SELECT ON public.clinic_members TO authenticated;
REVOKE ALL ON public.clinics FROM anon;
REVOKE ALL ON public.clinic_members FROM anon;

-- Single-campus: role check ignores clinic_id mismatch.
CREATE OR REPLACE FUNCTION public.has_clinic_role(target_clinic_id uuid, allowed_roles web_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members
    WHERE profile_id = (SELECT auth.uid())
      AND is_active = true
      AND member_role = ANY (allowed_roles)
  );
$function$;

COMMENT ON FUNCTION public.has_clinic_role(uuid, web_role[]) IS
  'Single-campus: active membership role check (clinic_id ignored).';
