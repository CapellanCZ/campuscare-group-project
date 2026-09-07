-- Re-normalize leftover faculty/employee ID Numbers from legacy `26-*****` to `2026-*****`.
-- Student `student_id` values are never modified.
-- Safe to re-run; already-canonical `YYYY-#####` values are unchanged.

CREATE OR REPLACE FUNCTION public.normalize_employee_campus_id(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  trimmed text;
  digits text;
BEGIN
  trimmed := btrim(COALESCE(raw, ''));
  IF trimmed = '' THEN
    RETURN raw;
  END IF;

  IF trimmed ~ '^\d{4}-\d{5}$' THEN
    RETURN trimmed;
  END IF;

  IF trimmed ~ '^\d{2}-\d{5}$' THEN
    RETURN '20' || trimmed;
  END IF;

  digits := regexp_replace(trimmed, '\D', '', 'g');

  IF digits ~ '^\d{7}$' THEN
    RETURN '20' || substring(digits from 1 for 2) || '-' || substring(digits from 3);
  END IF;

  IF digits ~ '^\d{9}$' THEN
    RETURN substring(digits from 1 for 4) || '-' || substring(digits from 5);
  END IF;

  RETURN raw;
END;
$$;

-- Faculty / employee patient records only
UPDATE public.patient_records
SET employee_id = public.normalize_employee_campus_id(employee_id)
WHERE patient_type IN ('faculty', 'employee')
  AND employee_id IS NOT NULL
  AND employee_id IS DISTINCT FROM public.normalize_employee_campus_id(employee_id);

UPDATE public.patients
SET employee_id = public.normalize_employee_campus_id(employee_id)
WHERE patient_type IN ('faculty', 'employee')
  AND employee_id IS NOT NULL
  AND employee_id IS DISTINCT FROM public.normalize_employee_campus_id(employee_id);

-- Queue tickets: only rewrite legacy employee-style IDs, never student YYYY-######
UPDATE public.health_queue_tickets
SET campus_id = public.normalize_employee_campus_id(campus_id)
WHERE campus_id IS NOT NULL
  AND campus_id !~ '^\d{4}-\d{6}$'
  AND (
    campus_id ~ '^\d{2}-\d{5}$'
    OR regexp_replace(campus_id, '\D', '', 'g') ~ '^\d{7}$'
  );

UPDATE public.users
SET employee_id = public.normalize_employee_campus_id(employee_id)
WHERE employee_id IS NOT NULL
  AND employee_id IS DISTINCT FROM public.normalize_employee_campus_id(employee_id);

DROP FUNCTION public.normalize_employee_campus_id(text);
