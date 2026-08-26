-- Backfill issued_by on legacy certificates so physicians/dentists can see
-- records they previously issued (stored only as doctor_name text).

UPDATE public.medical_certificates mc
SET issued_by = matched.user_id
FROM (
  SELECT
    mc2.id AS certificate_id,
    u.id AS user_id
  FROM public.medical_certificates mc2
  JOIN public.users u
    ON u.primary_role IN (
      'physician'::public.web_role,
      'dentist'::public.web_role
    )
   AND lower(
     trim(
       regexp_replace(
         coalesce(mc2.doctor_name, ''),
         '^(dr|dra)\.?\s+',
         '',
         'i'
       )
     )
   ) = lower(
     trim(
       regexp_replace(
         coalesce(u.full_name, ''),
         '^(dr|dra)\.?\s+',
         '',
         'i'
       )
     )
   )
  WHERE mc2.issued_by IS NULL
    AND nullif(trim(mc2.doctor_name), '') IS NOT NULL
) AS matched
WHERE mc.id = matched.certificate_id
  AND mc.issued_by IS NULL;
