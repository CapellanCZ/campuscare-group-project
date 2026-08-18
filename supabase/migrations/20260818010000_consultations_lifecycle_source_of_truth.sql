-- Consultations become the clinic lifecycle source of truth.
-- Queue tickets remain for queue number/position only.

-- 1) consultations: status + appointment/provider/vitals
ALTER TABLE public.consultations
  DROP CONSTRAINT IF EXISTS consultations_status_check;

UPDATE public.consultations
SET status = CASE status
  WHEN 'Awaiting Assessment' THEN 'waiting'
  WHEN 'In Progress' THEN 'ongoing'
  WHEN 'Completed' THEN 'completed'
  WHEN 'Cancelled' THEN 'cancelled'
  ELSE status
END
WHERE status IN (
  'Awaiting Assessment',
  'In Progress',
  'Completed',
  'Cancelled'
);

ALTER TABLE public.consultations
  ALTER COLUMN status SET DEFAULT 'waiting';

ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_status_check
  CHECK (
    status IN (
      'waiting',
      'ongoing',
      'completed',
      'cancelled'
    )
  );

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS appointment_id uuid
    REFERENCES public.appointments (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_type text,
  ADD COLUMN IF NOT EXISTS vitals jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.consultations
  DROP CONSTRAINT IF EXISTS consultations_provider_type_check;

ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_provider_type_check
  CHECK (
    provider_type IS NULL
    OR provider_type IN ('physician', 'dentist')
  );

CREATE UNIQUE INDEX IF NOT EXISTS consultations_appointment_id_unique
  ON public.consultations (appointment_id)
  WHERE appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS consultations_provider_type_idx
  ON public.consultations (provider_type);

COMMENT ON COLUMN public.consultations.appointment_id IS
  'Booking/request row (appointments) that created this consultation on nurse approve.';
COMMENT ON COLUMN public.consultations.provider_type IS
  'physician (medical) or dentist (dental).';
COMMENT ON COLUMN public.consultations.vitals IS
  'Nurse-recorded vitals for this consultation (not sourced from queue tickets).';

-- 2) tickets: pointer to consultation
ALTER TABLE public.health_queue_tickets
  ADD COLUMN IF NOT EXISTS consultation_id uuid
    REFERENCES public.consultations (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS health_queue_tickets_consultation_id_idx
  ON public.health_queue_tickets (consultation_id);
