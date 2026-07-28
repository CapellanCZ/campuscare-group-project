-- Staff Patient Records + Consultations modules.
-- Physician appointment charting moved to appointment_consultations (was empty).

ALTER TABLE public.consultations RENAME TO appointment_consultations;

DROP POLICY IF EXISTS "consultations_select_clinic" ON public.appointment_consultations;
DROP POLICY IF EXISTS "consultations_insert_doctor" ON public.appointment_consultations;
DROP POLICY IF EXISTS "consultations_update_doctor" ON public.appointment_consultations;

CREATE POLICY "appointment_consultations_select_clinic"
  ON public.appointment_consultations
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

CREATE POLICY "appointment_consultations_insert_doctor"
  ON public.appointment_consultations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_active_clinic_membership()
    AND (
      doctor_id = (SELECT auth.uid())
      OR public.has_clinic_role(
        clinic_id,
        ARRAY[
          'admin'::public.web_role,
          'physician'::public.web_role,
          'dentist'::public.web_role
        ]
      )
    )
  );

CREATE POLICY "appointment_consultations_update_doctor"
  ON public.appointment_consultations
  FOR UPDATE
  TO authenticated
  USING (
    public.has_active_clinic_membership()
    AND (
      doctor_id = (SELECT auth.uid())
      OR public.has_clinic_role(
        clinic_id,
        ARRAY[
          'admin'::public.web_role,
          'physician'::public.web_role,
          'dentist'::public.web_role
        ]
      )
    )
  )
  WITH CHECK (
    public.has_active_clinic_membership()
    AND (
      doctor_id = (SELECT auth.uid())
      OR public.has_clinic_role(
        clinic_id,
        ARRAY[
          'admin'::public.web_role,
          'physician'::public.web_role,
          'dentist'::public.web_role
        ]
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.patient_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  course text NOT NULL,
  year_level text,
  gender text,
  birth_date date,
  blood_type text,
  allergies text,
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  medical_conditions text,
  notes text,
  last_visit date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_records_student_id_key UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS patient_records_student_id_idx ON public.patient_records (student_id);
CREATE INDEX IF NOT EXISTS patient_records_last_name_idx ON public.patient_records (last_name);
CREATE INDEX IF NOT EXISTS patient_records_course_idx ON public.patient_records (course);
CREATE INDEX IF NOT EXISTS patient_records_last_visit_idx ON public.patient_records (last_visit DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS patient_records_set_updated_at ON public.patient_records;
CREATE TRIGGER patient_records_set_updated_at
  BEFORE UPDATE ON public.patient_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_records_select_authenticated" ON public.patient_records;
CREATE POLICY "patient_records_select_authenticated"
  ON public.patient_records FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "patient_records_insert_authenticated" ON public.patient_records;
CREATE POLICY "patient_records_insert_authenticated"
  ON public.patient_records FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "patient_records_update_authenticated" ON public.patient_records;
CREATE POLICY "patient_records_update_authenticated"
  ON public.patient_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "patient_records_delete_authenticated" ON public.patient_records;
CREATE POLICY "patient_records_delete_authenticated"
  ON public.patient_records FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_records TO authenticated;
REVOKE ALL ON public.patient_records FROM anon;

CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patient_records (id) ON DELETE CASCADE,
  chief_complaint text,
  symptoms text,
  assessment text,
  diagnosis text,
  treatment text,
  prescription text,
  provider_name text,
  provider_role text,
  station text,
  status text NOT NULL DEFAULT 'Awaiting Assessment'
    CHECK (status IN ('Awaiting Assessment', 'In Progress', 'Completed', 'Cancelled')),
  priority text NOT NULL DEFAULT 'Normal'
    CHECK (priority IN ('Low', 'Normal', 'High', 'Emergency')),
  consultation_date timestamptz NOT NULL DEFAULT now(),
  follow_up_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultations_patient_id_idx ON public.consultations (patient_id);
CREATE INDEX IF NOT EXISTS consultations_status_idx ON public.consultations (status);
CREATE INDEX IF NOT EXISTS consultations_consultation_date_idx ON public.consultations (consultation_date DESC);
CREATE INDEX IF NOT EXISTS consultations_provider_name_idx ON public.consultations (provider_name);
CREATE INDEX IF NOT EXISTS consultations_station_idx ON public.consultations (station);

DROP TRIGGER IF EXISTS consultations_set_updated_at ON public.consultations;
CREATE TRIGGER consultations_set_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consultations_select_authenticated" ON public.consultations;
CREATE POLICY "consultations_select_authenticated"
  ON public.consultations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "consultations_insert_authenticated" ON public.consultations;
CREATE POLICY "consultations_insert_authenticated"
  ON public.consultations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "consultations_update_authenticated" ON public.consultations;
CREATE POLICY "consultations_update_authenticated"
  ON public.consultations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "consultations_delete_authenticated" ON public.consultations;
CREATE POLICY "consultations_delete_authenticated"
  ON public.consultations FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO authenticated;
REVOKE ALL ON public.consultations FROM anon;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_records;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.patient_records REPLICA IDENTITY FULL;
ALTER TABLE public.consultations REPLICA IDENTITY FULL;
