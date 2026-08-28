-- Dental Patient Chart (odontogram + clinical oral findings) on appointments.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS dental_chart jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.appointments.dental_chart IS
  'NU HSO Dental Patient Chart: demographics snapshot, odontogram markings, clinical oral exam, and medical history fields for the visit.';
