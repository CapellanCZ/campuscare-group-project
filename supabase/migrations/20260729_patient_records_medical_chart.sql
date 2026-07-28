-- Student medical chart (paper MEDICAL RECORD) + edit audit on patient_records.

ALTER TABLE public.patient_records
  ADD COLUMN IF NOT EXISTS civil_status text,
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS medical_history jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS physical_exam jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.patient_records.medical_history IS
  'Paper MEDICAL RECORD history: previous illness + condition flags';
COMMENT ON COLUMN public.patient_records.physical_exam IS
  'Paper MEDICAL RECORD physical examination: vitals + system review';
COMMENT ON COLUMN public.patient_records.last_edited_at IS
  'When medical chart was last saved by clinic staff';
COMMENT ON COLUMN public.patient_records.last_edited_by IS
  'auth.users id of staff who last saved the medical chart';
