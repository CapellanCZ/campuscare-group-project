-- Separate clinical patient_records lifecycle from account lifecycle.
--
-- Previously, deleting a clinical row also deleted the mirrored public.patients
-- row (same campus ID). That removed the auth_user_id link and broke re-login /
-- re-association even though auth.users / public.users were not FK-cascaded.
--
-- Annual HSO clinical cleanup must remove clinical charts without terminating
-- eligible NU Dasmariñas accounts.

DROP TRIGGER IF EXISTS patient_records_delete_mirror_patients
  ON public.patient_records;

DROP FUNCTION IF EXISTS public.delete_operational_patient_for_record();

COMMENT ON TABLE public.patient_records IS
  'Clinical HSO patient charts. May be archived/deleted per retention policy without deleting auth or public.users accounts.';

COMMENT ON TABLE public.patients IS
  'Operational patient directory (queue/mobile). Linked to auth via auth_user_id. Survives clinical patient_records cleanup.';

COMMENT ON TABLE public.users IS
  'Application profiles keyed to auth.users.id. Independent of clinical patient_records retention.';
