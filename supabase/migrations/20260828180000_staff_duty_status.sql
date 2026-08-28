-- Explicit staff duty status (Start Duty / End Duty).
-- Real-time availability is driven by duty status, not clinical schedule slots.

CREATE TABLE IF NOT EXISTS public.staff_duty_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_available'
    CHECK (status IN ('not_available', 'available', 'on_break')),
  duty_started_at timestamptz,
  duty_ended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_duty_status IS
  'Per-staff duty lifecycle: not_available → available → on_break → available → not_available.';

CREATE TABLE IF NOT EXISTS public.staff_duty_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_duty_sessions_user_started_idx
  ON public.staff_duty_sessions (user_id, started_at DESC);

COMMENT ON TABLE public.staff_duty_sessions IS
  'Append-only duty session history for audit.';

ALTER TABLE public.staff_duty_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_duty_sessions ENABLE ROW LEVEL SECURITY;

-- Read: authenticated staff can read duty status (for team overview / display)
CREATE POLICY staff_duty_status_select ON public.staff_duty_status
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY staff_duty_status_select_anon ON public.staff_duty_status
  FOR SELECT TO anon
  USING (true);

-- Write: own row or admin
CREATE POLICY staff_duty_status_update_own ON public.staff_duty_status
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY staff_duty_status_admin ON public.staff_duty_status
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.primary_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.primary_role = 'admin'
    )
  );

CREATE POLICY staff_duty_sessions_select ON public.staff_duty_sessions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY staff_duty_sessions_insert_own ON public.staff_duty_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY staff_duty_sessions_update_own ON public.staff_duty_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
