-- Operational clinical tables: health consultations + staff RLS helpers.
-- Safe to run when health_appointments / students / patients already exist remotely.

CREATE TABLE IF NOT EXISTS public.health_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.health_appointments (id) ON DELETE SET NULL,
  student_id text,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  station text NOT NULL DEFAULT 'nurse'
    CHECK (station IN ('nurse', 'physician', 'dentist')),
  chief_complaint text,
  status text NOT NULL DEFAULT 'awaiting_assessment'
    CHECK (status IN ('awaiting_assessment', 'in_progress', 'completed')),
  provider_name text,
  assessment_notes text,
  diagnosis text,
  treatment_notes text,
  prescription text,
  certificate_status text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_consultations_visit_date_idx
  ON public.health_consultations (visit_date DESC);

CREATE INDEX IF NOT EXISTS health_consultations_appointment_id_idx
  ON public.health_consultations (appointment_id);

CREATE INDEX IF NOT EXISTS health_consultations_status_idx
  ON public.health_consultations (status);

CREATE OR REPLACE FUNCTION public.set_health_consultations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS health_consultations_set_updated_at ON public.health_consultations;
CREATE TRIGGER health_consultations_set_updated_at
  BEFORE UPDATE ON public.health_consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_health_consultations_updated_at();

-- Optional student profile fields used by patient records UI.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'students'
  ) THEN
    ALTER TABLE public.students ADD COLUMN IF NOT EXISTS course text;
    ALTER TABLE public.students ADD COLUMN IF NOT EXISTS year_level text;
    ALTER TABLE public.students ADD COLUMN IF NOT EXISTS blood_type text;
    ALTER TABLE public.students ADD COLUMN IF NOT EXISTS allergies text;
  END IF;
END $$;

-- Optional patient medical profile fields.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'patients'
  ) THEN
    ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS blood_type text;
    ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS allergies text;
    ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS course text;
    ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS year_level text;
  END IF;
END $$;

ALTER TABLE public.health_consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read health consultations"
  ON public.health_consultations;
CREATE POLICY "authenticated read health consultations"
  ON public.health_consultations
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated insert health consultations"
  ON public.health_consultations;
CREATE POLICY "authenticated insert health consultations"
  ON public.health_consultations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated update health consultations"
  ON public.health_consultations;
CREATE POLICY "authenticated update health consultations"
  ON public.health_consultations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated delete health consultations"
  ON public.health_consultations;
CREATE POLICY "authenticated delete health consultations"
  ON public.health_consultations
  FOR DELETE
  TO authenticated
  USING (true);

-- Staff read/update patients scoped to clinic membership.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'patients'
  ) THEN
    ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "clinic members read patients" ON public.patients;
    CREATE POLICY "clinic members read patients"
      ON public.patients
      FOR SELECT
      TO authenticated
      USING (public.is_clinic_member(clinic_id));

    DROP POLICY IF EXISTS "clinic members update patients" ON public.patients;
    CREATE POLICY "clinic members update patients"
      ON public.patients
      FOR UPDATE
      TO authenticated
      USING (public.is_clinic_member(clinic_id))
      WITH CHECK (public.is_clinic_member(clinic_id));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_consultations TO authenticated;
