-- Allocate clinic-wide certificate numbers without relying on issuer-scoped SELECT RLS.
-- Physicians/dentists can only see their own rows, so max(certificate_number) via the
-- table API undercounts and collides on the unique constraint.

CREATE OR REPLACE FUNCTION public.next_medical_certificate_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_text text;
  prefix text;
  latest text;
  next_n integer;
  suffix text;
BEGIN
  IF NOT public.has_active_clinic_membership() THEN
    RAISE EXCEPTION 'not authorized to allocate certificate numbers'
      USING ERRCODE = '42501';
  END IF;

  -- Serialize allocators in this transaction to reduce races under concurrent creates.
  PERFORM pg_advisory_xact_lock(hashtext('medical_certificates.certificate_number'));

  year_text := to_char((timezone('Asia/Manila', now())), 'YYYY');
  prefix := 'MC-' || year_text || '-';

  SELECT mc.certificate_number
  INTO latest
  FROM public.medical_certificates mc
  WHERE mc.certificate_number LIKE prefix || '%'
  ORDER BY mc.certificate_number DESC
  LIMIT 1;

  IF latest IS NULL THEN
    next_n := 1;
  ELSE
    suffix := substring(latest FROM length(prefix) + 1);
    BEGIN
      next_n := suffix::integer + 1;
    EXCEPTION
      WHEN invalid_text_representation THEN
        next_n := 1;
    END;
  END IF;

  IF next_n < 1 THEN
    next_n := 1;
  END IF;

  RETURN prefix || lpad(next_n::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_medical_certificate_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_medical_certificate_number() TO authenticated;

COMMENT ON FUNCTION public.next_medical_certificate_number() IS
  'Returns the next clinic-wide MC-YYYY-NNNN number; bypasses issuer SELECT RLS.';
