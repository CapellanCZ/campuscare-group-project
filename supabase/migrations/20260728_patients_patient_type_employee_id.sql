-- Phase 1: student | faculty typing + campus IDs (student_id / employee_id)

-- Operational patients (queue / admin directory)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS patient_type text,
  ADD COLUMN IF NOT EXISTS employee_id text;

UPDATE public.patients
SET patient_type = CASE
  WHEN lower(coalesce(affiliation, '')) = 'faculty' THEN 'faculty'
  ELSE 'student'
END
WHERE patient_type IS NULL;

UPDATE public.patients
SET affiliation = patient_type
WHERE affiliation IS DISTINCT FROM patient_type;

ALTER TABLE public.patients
  ALTER COLUMN patient_type SET DEFAULT 'student',
  ALTER COLUMN patient_type SET NOT NULL;

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_patient_type_check;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_patient_type_check
  CHECK (patient_type IN ('student', 'faculty'));

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_type_campus_id_check;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_type_campus_id_check
  CHECK (
    (
      patient_type = 'student'
      AND student_id IS NOT NULL
      AND btrim(student_id) <> ''
    )
    OR (
      patient_type = 'faculty'
      AND employee_id IS NOT NULL
      AND btrim(employee_id) <> ''
    )
  );

CREATE INDEX IF NOT EXISTS patients_patient_type_idx
  ON public.patients (patient_type);
CREATE INDEX IF NOT EXISTS patients_employee_id_idx
  ON public.patients (employee_id)
  WHERE employee_id IS NOT NULL;

-- Clinical patient_records (staff Patient Records module)
ALTER TABLE public.patient_records
  ADD COLUMN IF NOT EXISTS patient_type text,
  ADD COLUMN IF NOT EXISTS employee_id text;

UPDATE public.patient_records
SET patient_type = 'student'
WHERE patient_type IS NULL;

ALTER TABLE public.patient_records
  ALTER COLUMN patient_type SET DEFAULT 'student',
  ALTER COLUMN patient_type SET NOT NULL,
  ALTER COLUMN student_id DROP NOT NULL,
  ALTER COLUMN course DROP NOT NULL;

ALTER TABLE public.patient_records
  DROP CONSTRAINT IF EXISTS patient_records_student_id_key;

DROP INDEX IF EXISTS public.patient_records_student_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS patient_records_student_id_unique
  ON public.patient_records (student_id)
  WHERE student_id IS NOT NULL AND btrim(student_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS patient_records_employee_id_unique
  ON public.patient_records (employee_id)
  WHERE employee_id IS NOT NULL AND btrim(employee_id) <> '';

ALTER TABLE public.patient_records
  DROP CONSTRAINT IF EXISTS patient_records_patient_type_check;
ALTER TABLE public.patient_records
  ADD CONSTRAINT patient_records_patient_type_check
  CHECK (patient_type IN ('student', 'faculty'));

ALTER TABLE public.patient_records
  DROP CONSTRAINT IF EXISTS patient_records_type_campus_id_check;
ALTER TABLE public.patient_records
  ADD CONSTRAINT patient_records_type_campus_id_check
  CHECK (
    (
      patient_type = 'student'
      AND student_id IS NOT NULL
      AND btrim(student_id) <> ''
    )
    OR (
      patient_type = 'faculty'
      AND employee_id IS NOT NULL
      AND btrim(employee_id) <> ''
    )
  );

CREATE INDEX IF NOT EXISTS patient_records_patient_type_idx
  ON public.patient_records (patient_type);
