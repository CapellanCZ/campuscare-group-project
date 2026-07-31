-- Phase 2: self-contained tickets for nurse → specialty loop

ALTER TABLE public.health_queue_tickets
  ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS station text NOT NULL DEFAULT 'nurse',
  ADD COLUMN IF NOT EXISTS call_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejoin_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_rejoined_at timestamptz,
  ADD COLUMN IF NOT EXISTS service_date date NOT NULL DEFAULT ((timezone('Asia/Manila', now()))::date),
  ADD COLUMN IF NOT EXISTS patient_name text,
  ADD COLUMN IF NOT EXISTS campus_id text,
  ADD COLUMN IF NOT EXISTS consultation_type text,
  ADD COLUMN IF NOT EXISTS assigned_staff_name text,
  ADD COLUMN IF NOT EXISTS chief_complaint text,
  ADD COLUMN IF NOT EXISTS vitals_bp_systolic integer,
  ADD COLUMN IF NOT EXISTS vitals_bp_diastolic integer,
  ADD COLUMN IF NOT EXISTS vitals_heart_rate integer,
  ADD COLUMN IF NOT EXISTS vitals_temperature_c numeric(4,1),
  ADD COLUMN IF NOT EXISTS vitals_spo2 integer,
  ADD COLUMN IF NOT EXISTS intake_notes text,
  ADD COLUMN IF NOT EXISTS intake_completed_at timestamptz;

ALTER TABLE public.health_queue_tickets
  DROP CONSTRAINT IF EXISTS health_queue_tickets_status_check;

ALTER TABLE public.health_queue_tickets
  ADD CONSTRAINT health_queue_tickets_status_check
  CHECK (status IN ('waiting', 'called', 'completed', 'expired', 'no_show'));

ALTER TABLE public.health_queue_tickets
  DROP CONSTRAINT IF EXISTS health_queue_tickets_station_check;

ALTER TABLE public.health_queue_tickets
  ADD CONSTRAINT health_queue_tickets_station_check
  CHECK (station IN ('nurse', 'physician', 'dentist'));

CREATE INDEX IF NOT EXISTS health_queue_tickets_station_status_idx
  ON public.health_queue_tickets (station, status, queue_position);

CREATE INDEX IF NOT EXISTS health_queue_tickets_service_date_idx
  ON public.health_queue_tickets (service_date DESC);

CREATE INDEX IF NOT EXISTS health_queue_tickets_patient_id_idx
  ON public.health_queue_tickets (patient_id)
  WHERE patient_id IS NOT NULL;

CREATE OR REPLACE VIEW public.public_queue_display
WITH (security_invoker = false) AS
SELECT
  t.id AS ticket_id,
  COALESCE(t.queue_number, t.queue_position) AS queue_number,
  t.ticket_code,
  t.status AS ticket_status,
  t.estimated_wait_minutes,
  t.checked_in_at,
  t.updated_at AS ticket_updated_at,
  t.id AS appointment_id,
  CASE
    WHEN t.station = 'nurse' THEN 'queued_for_nurse'
    WHEN t.status = 'called' THEN 'provider_in_progress'
    WHEN t.status = 'completed' THEN 'completed'
    ELSE 'queued_for_nurse'
  END AS workflow_status,
  CASE WHEN t.station = 'nurse' THEN NULL ELSE t.station END AS provider_queue,
  t.consultation_type,
  t.consultation_type AS service,
  t.assigned_staff_name AS assigned_personnel,
  CASE WHEN t.status = 'completed' THEN t.updated_at ELSE NULL END AS consultation_completed_at,
  COALESCE(t.campus_id, t.ticket_code) AS patient_display_name,
  t.station
FROM public.health_queue_tickets t
WHERE t.service_date = (timezone('Asia/Manila', now()))::date
  AND (
    t.status IN ('waiting', 'called')
    OR (
      t.status = 'completed'
      AND COALESCE(t.updated_at, t.created_at, now()) >= now() - interval '14 days'
    )
  );

GRANT SELECT ON public.public_queue_display TO anon, authenticated;
