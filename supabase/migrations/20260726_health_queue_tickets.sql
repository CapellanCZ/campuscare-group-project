-- Minimal clinic queue tickets table used by staff dashboards.
-- Optional FKs omitted so this can land before health_appointments exists.

CREATE TABLE IF NOT EXISTS public.health_queue_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid,
  health_appointment_id uuid,
  ticket_code text NOT NULL,
  queue_position integer NOT NULL DEFAULT 0,
  queue_number integer,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'called', 'completed', 'expired')),
  estimated_wait_minutes integer,
  checked_in_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_queue_tickets_status_idx
  ON public.health_queue_tickets (status);

CREATE INDEX IF NOT EXISTS health_queue_tickets_created_at_idx
  ON public.health_queue_tickets (created_at DESC);

ALTER TABLE public.health_queue_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read queue tickets" ON public.health_queue_tickets;
CREATE POLICY "staff read queue tickets"
  ON public.health_queue_tickets
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "staff write queue tickets" ON public.health_queue_tickets;
CREATE POLICY "staff write queue tickets"
  ON public.health_queue_tickets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_queue_tickets TO authenticated;
