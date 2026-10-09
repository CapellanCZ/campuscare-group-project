-- Soft-archive for Patient Records → Bin (permanent delete from Bin).

ALTER TABLE public.patient_records
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.patient_records.archived_at IS
  'When set, the record is hidden from the active directory and listed in Bin until permanently deleted.';

CREATE INDEX IF NOT EXISTS patient_records_archived_at_idx
  ON public.patient_records (archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS patient_records_active_last_name_idx
  ON public.patient_records (last_name)
  WHERE archived_at IS NULL;
