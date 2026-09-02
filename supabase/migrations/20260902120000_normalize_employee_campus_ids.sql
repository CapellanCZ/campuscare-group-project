-- Normalize faculty/employee campus IDs from legacy `26-*****` to `2026-*****`.
-- Student IDs (`YYYY-******`) are left unchanged.

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

  -- Already in 2026-***** (or any YYYY-*****) form.
  IF trimmed ~ '^\d{4}-\d{5}$' THEN
    RETURN trimmed;
  END IF;

  -- Legacy 26-***** (2-digit year + 5 digits).
  IF trimmed ~ '^\d{2}-\d{5}$' THEN
    RETURN '20' || trimmed;
  END IF;

  digits := regexp_replace(trimmed, '\D', '', 'g');

  -- Bare 7-digit 26xxxxx → 2026-xxxxx
  IF digits ~ '^\d{7}$' THEN
    RETURN '20' || substring(digits from 1 for 2) || '-' || substring(digits from 3);
  END IF;

  RETURN raw;
END;
$$;

UPDATE public.patient_records
SET employee_id = public.normalize_employee_campus_id(employee_id)
WHERE employee_id IS NOT NULL
  AND employee_id IS DISTINCT FROM public.normalize_employee_campus_id(employee_id);

UPDATE public.patients
SET employee_id = public.normalize_employee_campus_id(employee_id)
WHERE employee_id IS NOT NULL
  AND employee_id IS DISTINCT FROM public.normalize_employee_campus_id(employee_id);

UPDATE public.health_queue_tickets
SET campus_id = public.normalize_employee_campus_id(campus_id)
WHERE campus_id IS NOT NULL
  AND campus_id ~ '^\d{2}-\d{5}$';

DROP FUNCTION public.normalize_employee_campus_id(text);
