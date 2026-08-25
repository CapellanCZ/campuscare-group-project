-- Expand patient types; persist family background from campus roster CSV;
-- optional patient_type on walk-in tickets for visitors without a patient row.

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_patient_type_check;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_patient_type_check
  CHECK (patient_type IN ('student', 'faculty', 'employee', 'visitor'));

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
      patient_type IN ('faculty', 'employee')
      AND employee_id IS NOT NULL
      AND btrim(employee_id) <> ''
    )
    OR (patient_type = 'visitor')
  );

ALTER TABLE public.patient_records
  DROP CONSTRAINT IF EXISTS patient_records_patient_type_check;
ALTER TABLE public.patient_records
  ADD CONSTRAINT patient_records_patient_type_check
  CHECK (patient_type IN ('student', 'faculty', 'employee', 'visitor'));

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
      patient_type IN ('faculty', 'employee')
      AND employee_id IS NOT NULL
      AND btrim(employee_id) <> ''
    )
    OR (patient_type = 'visitor')
  );

ALTER TABLE public.patient_records
  ADD COLUMN IF NOT EXISTS family_background jsonb;

ALTER TABLE public.health_queue_tickets
  ADD COLUMN IF NOT EXISTS patient_type text;

ALTER TABLE public.health_queue_tickets
  DROP CONSTRAINT IF EXISTS health_queue_tickets_patient_type_check;
ALTER TABLE public.health_queue_tickets
  ADD CONSTRAINT health_queue_tickets_patient_type_check
  CHECK (
    patient_type IS NULL
    OR patient_type IN ('student', 'faculty', 'employee', 'visitor')
  );
