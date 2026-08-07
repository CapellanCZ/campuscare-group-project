-- Consultation workflow v2: provider_type, waitlisted, capacity, vitals, FKs, device tokens

-- ---------------------------------------------------------------------------
-- 1) consultation_requests
-- ---------------------------------------------------------------------------
ALTER TABLE public.consultation_requests
  DROP CONSTRAINT IF EXISTS consultation_requests_status_check;

ALTER TABLE public.consultation_requests
  ADD CONSTRAINT consultation_requests_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'pending'::text,
        'approved'::text,
        'declined'::text,
        'rescheduled'::text,
        'completed'::text,
        'cancelled'::text,
        'waitlisted'::text
      ]
    )
  );

ALTER TABLE public.consultation_requests
  ADD COLUMN IF NOT EXISTS provider_type text,
  ADD COLUMN IF NOT EXISTS queue_number integer,
  ADD COLUMN IF NOT EXISTS waitlisted_at timestamptz;

UPDATE public.consultation_requests
SET provider_type = CASE
  WHEN lower(coalesce(service, '')) ~ '(dental|dentist|tooth)' THEN 'dentist'
  ELSE 'physician'
END
WHERE provider_type IS NULL;

ALTER TABLE public.consultation_requests
  ALTER COLUMN provider_type SET DEFAULT 'physician';

ALTER TABLE public.consultation_requests
  ALTER COLUMN provider_type SET NOT NULL;

ALTER TABLE public.consultation_requests
  DROP CONSTRAINT IF EXISTS consultation_requests_provider_type_check;

ALTER TABLE public.consultation_requests
  ADD CONSTRAINT consultation_requests_provider_type_check
  CHECK (provider_type = ANY (ARRAY['physician'::text, 'dentist'::text]));

CREATE INDEX IF NOT EXISTS consultation_requests_provider_date_idx
  ON public.consultation_requests (provider_type, preferred_date);

-- ---------------------------------------------------------------------------
-- 2) Daily capacity per provider type
-- Single-campus: clinic_id is the fixed CampusCare UUID (no clinics catalog table).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_consultation_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  provider_type text NOT NULL
    CHECK (provider_type = ANY (ARRAY['physician'::text, 'dentist'::text])),
  max_daily_slots integer NOT NULL DEFAULT 20
    CHECK (max_daily_slots > 0 AND max_daily_slots <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_consultation_capacity_clinic_provider_key
    UNIQUE (clinic_id, provider_type)
);

ALTER TABLE public.clinic_consultation_capacity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read consultation capacity" ON public.clinic_consultation_capacity;
CREATE POLICY "staff read consultation capacity"
  ON public.clinic_consultation_capacity
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

DROP POLICY IF EXISTS "staff write consultation capacity" ON public.clinic_consultation_capacity;
CREATE POLICY "staff write consultation capacity"
  ON public.clinic_consultation_capacity
  FOR ALL
  TO authenticated
  USING (public.has_active_clinic_membership())
  WITH CHECK (public.has_active_clinic_membership());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_consultation_capacity TO authenticated;
REVOKE ALL ON public.clinic_consultation_capacity FROM anon;

-- Seed CampusCare single-campus capacity (matches lib/auth/campus-clinic.ts)
INSERT INTO public.clinic_consultation_capacity (clinic_id, provider_type, max_daily_slots)
VALUES
  ('34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'::uuid, 'physician', 20),
  ('34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'::uuid, 'dentist', 20)
ON CONFLICT (clinic_id, provider_type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) health_queue_tickets vitals + request FK + provider_type
-- ---------------------------------------------------------------------------
ALTER TABLE public.health_queue_tickets
  ADD COLUMN IF NOT EXISTS vitals_height_cm numeric,
  ADD COLUMN IF NOT EXISTS vitals_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS vitals_respiratory_rate integer,
  ADD COLUMN IF NOT EXISTS consultation_request_id uuid
    REFERENCES public.consultation_requests (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_type text
    CHECK (
      provider_type IS NULL
      OR provider_type = ANY (ARRAY['physician'::text, 'dentist'::text])
    );

CREATE INDEX IF NOT EXISTS health_queue_tickets_request_id_idx
  ON public.health_queue_tickets (consultation_request_id);

CREATE INDEX IF NOT EXISTS health_queue_tickets_service_date_provider_idx
  ON public.health_queue_tickets (service_date, provider_type);

-- ---------------------------------------------------------------------------
-- 4) consultations FKs
-- ---------------------------------------------------------------------------
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS queue_ticket_id uuid
    REFERENCES public.health_queue_tickets (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consultation_request_id uuid
    REFERENCES public.consultation_requests (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS consultations_queue_ticket_id_idx
  ON public.consultations (queue_ticket_id);

CREATE INDEX IF NOT EXISTS consultations_consultation_request_id_idx
  ON public.consultations (consultation_request_id);

-- ---------------------------------------------------------------------------
-- 5) Patient device tokens (push)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients (id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL DEFAULT 'unknown'
    CHECK (platform = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text, 'unknown'::text])),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_device_tokens_token_key UNIQUE (token),
  CONSTRAINT patient_device_tokens_owner_check
    CHECK (user_id IS NOT NULL OR patient_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS patient_device_tokens_user_id_idx
  ON public.patient_device_tokens (user_id);

CREATE INDEX IF NOT EXISTS patient_device_tokens_patient_id_idx
  ON public.patient_device_tokens (patient_id);

ALTER TABLE public.patient_device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own device tokens" ON public.patient_device_tokens;
CREATE POLICY "users manage own device tokens"
  ON public.patient_device_tokens
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "staff read device tokens" ON public.patient_device_tokens;
CREATE POLICY "staff read device tokens"
  ON public.patient_device_tokens
  FOR SELECT
  TO authenticated
  USING (public.has_active_clinic_membership());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_device_tokens TO authenticated;
REVOKE ALL ON public.patient_device_tokens FROM anon;
