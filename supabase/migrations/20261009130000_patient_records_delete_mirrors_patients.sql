-- Keep operational patients in sync with clinical patient_records.
-- patient_records and patients are the same person (matched by campus ID).

CREATE OR REPLACE FUNCTION public.delete_operational_patient_for_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.student_id IS NOT NULL AND btrim(OLD.student_id) <> '' THEN
    DELETE FROM public.patients
    WHERE student_id = OLD.student_id;
  ELSIF OLD.employee_id IS NOT NULL AND btrim(OLD.employee_id) <> '' THEN
    DELETE FROM public.patients
    WHERE employee_id = OLD.employee_id;
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.delete_operational_patient_for_record() IS
  'When a clinical patient_records row is deleted, also remove the mirrored patients row (same campus ID).';

DROP TRIGGER IF EXISTS patient_records_delete_mirror_patients
  ON public.patient_records;

CREATE TRIGGER patient_records_delete_mirror_patients
  AFTER DELETE ON public.patient_records
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_operational_patient_for_record();

REVOKE ALL ON FUNCTION public.delete_operational_patient_for_record() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_operational_patient_for_record() FROM anon;
REVOKE ALL ON FUNCTION public.delete_operational_patient_for_record() FROM authenticated;
