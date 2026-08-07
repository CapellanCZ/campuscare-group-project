-- Nurse intake on appointments: queue fields + waitlisted status (no clinics FK)

-- ---------------------------------------------------------------------------
-- 1) Allow nullable doctor_id (mobile may leave unassigned)
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  ALTER COLUMN doctor_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Queue / provider columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS provider_type text
    CHECK (
      provider_type IS NULL
      OR provider_type = ANY (ARRAY['physician'::text, 'dentist'::text])
    ),
  ADD COLUMN IF NOT EXISTS queue_number integer,
  ADD COLUMN IF NOT EXISTS queue_ticket_id uuid
    REFERENCES public.health_queue_tickets (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS waitlisted_at timestamptz;

UPDATE public.appointments
SET provider_type = 'physician'
WHERE provider_type IS NULL;

ALTER TABLE public.appointments
  ALTER COLUMN provider_type SET DEFAULT 'physician';

ALTER TABLE public.appointments
  ALTER COLUMN provider_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS appointments_provider_starts_idx
  ON public.appointments (provider_type, starts_at);

CREATE INDEX IF NOT EXISTS appointments_queue_ticket_id_idx
  ON public.appointments (queue_ticket_id);

CREATE INDEX IF NOT EXISTS appointments_status_idx
  ON public.appointments (status);

-- ---------------------------------------------------------------------------
-- 3) Add waitlisted to appointment_status enum
--    (status is public.appointment_status, not a text CHECK)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'appointment_status'
      AND e.enumlabel = 'waitlisted'
  ) THEN
    ALTER TYPE public.appointment_status ADD VALUE 'waitlisted';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Ensure tickets can link back to appointments (column often already exists)
-- ---------------------------------------------------------------------------
ALTER TABLE public.health_queue_tickets
  ADD COLUMN IF NOT EXISTS appointment_id uuid;

CREATE INDEX IF NOT EXISTS health_queue_tickets_appointment_id_idx
  ON public.health_queue_tickets (appointment_id);
