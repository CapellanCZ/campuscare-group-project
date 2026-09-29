-- Harden medical document number allocation:
-- 1) Skip certificate_numbers that already exist for the prefix
-- 2) Prefer numeric suffix ordering over lexical DESC
-- Keeps advisory lock; does not drop uniqueness on certificate_number.

CREATE OR REPLACE FUNCTION public.next_medical_document_number(p_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_text text;
  prefix text;
  next_n integer;
  candidate text;
  attempts integer := 0;
BEGIN
  IF NOT public.has_active_clinic_membership() THEN
    RAISE EXCEPTION 'not authorized to allocate document numbers'
      USING ERRCODE = '42501';
  END IF;

  IF p_prefix IS NULL OR btrim(p_prefix) = '' THEN
    RAISE EXCEPTION 'document prefix is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('medical_documents.' || p_prefix));

  year_text := to_char((timezone('Asia/Manila', now())), 'YYYY');
  prefix := upper(btrim(p_prefix)) || '-' || year_text || '-';

  SELECT COALESCE(
    MAX(
      CASE
        WHEN substring(mc.certificate_number FROM length(prefix) + 1) ~ '^[0-9]+$'
          THEN substring(mc.certificate_number FROM length(prefix) + 1)::integer
        ELSE NULL
      END
    ),
    0
  ) + 1
  INTO next_n
  FROM public.medical_certificates mc
  WHERE mc.certificate_number LIKE prefix || '%';

  IF next_n IS NULL OR next_n < 1 THEN
    next_n := 1;
  END IF;

  LOOP
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'could not allocate a unique document number for prefix %', upper(btrim(p_prefix))
        USING ERRCODE = 'P0001';
    END IF;

    candidate := prefix || lpad(next_n::text, 4, '0');

    IF NOT EXISTS (
      SELECT 1
      FROM public.medical_certificates mc
      WHERE mc.certificate_number = candidate
    ) THEN
      RETURN candidate;
    END IF;

    next_n := next_n + 1;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.next_medical_document_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_medical_document_number(text) TO authenticated;
