-- Clinic office hours, break status, and staff weekly hour defaults.
-- Mobile contract: SELECT clinic_office_hours / break status / doctor_availability
-- (treat doctor_id as any staff user_id) to display hours and open/break state.

-- ---------- clinic_office_hours ----------
CREATE TABLE IF NOT EXISTS public.clinic_office_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time,
  end_time time,
  is_closed boolean NOT NULL DEFAULT false,
  timezone text NOT NULL DEFAULT 'Asia/Manila',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_office_hours_unique_day UNIQUE (clinic_id, day_of_week),
  CONSTRAINT clinic_office_hours_times_chk CHECK (
    is_closed = true
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

COMMENT ON TABLE public.clinic_office_hours IS
  'Weekly clinic operating hours (Asia/Manila). Readable by mobile for office-hours display.';

-- ---------- clinic_break_status ----------
CREATE TABLE IF NOT EXISTS public.clinic_break_status (
  clinic_id uuid PRIMARY KEY,
  is_on_break boolean NOT NULL DEFAULT false,
  resumes_at timestamptz,
  set_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_break_resumes_chk CHECK (
    is_on_break = false OR resumes_at IS NOT NULL
  )
);

COMMENT ON TABLE public.clinic_break_status IS
  'Clinic-wide On Break flag with required reopen time. Set by nurse/admin.';

-- ---------- staff_break_status ----------
CREATE TABLE IF NOT EXISTS public.staff_break_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  is_on_break boolean NOT NULL DEFAULT false,
  resumes_at timestamptz,
  set_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_break_resumes_chk CHECK (
    is_on_break = false OR resumes_at IS NOT NULL
  )
);

COMMENT ON TABLE public.staff_break_status IS
  'Per-staff On Break flag with required reopen time (physician/dentist/nurse).';

COMMENT ON TABLE public.doctor_availability IS
  'Weekly staff availability slots. doctor_id is the staff users.id (physician, dentist, or nurse).';

-- Seed clinic hours for campus clinic UUID
INSERT INTO public.clinic_office_hours (
  clinic_id, day_of_week, start_time, end_time, is_closed, timezone
)
VALUES
  ('34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b', 0, NULL, NULL, true, 'Asia/Manila'),
  ('34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b', 1, '07:00', '21:00', false, 'Asia/Manila'),
  ('34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b', 2, '07:00', '21:00', false, 'Asia/Manila'),
  ('34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b', 3, '07:00', '21:00', false, 'Asia/Manila'),
  ('34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b', 4, '07:00', '21:00', false, 'Asia/Manila'),
  ('34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b', 5, '07:00', '21:00', false, 'Asia/Manila'),
  ('34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b', 6, '07:00', '19:00', false, 'Asia/Manila')
ON CONFLICT (clinic_id, day_of_week) DO UPDATE
SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  is_closed = EXCLUDED.is_closed,
  timezone = EXCLUDED.timezone,
  updated_at = now();

INSERT INTO public.clinic_break_status (clinic_id, is_on_break, resumes_at)
VALUES ('34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b', false, NULL)
ON CONFLICT (clinic_id) DO NOTHING;

-- Seed default weekly hours for staff who have none yet
-- Physician: Mon/Wed/Thu 09:00-18:00
INSERT INTO public.doctor_availability (
  clinic_id, doctor_id, day_of_week, start_time, end_time, timezone, is_active
)
SELECT
  COALESCE(cm.clinic_id, '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'::uuid),
  u.id,
  d.dow,
  '09:00'::time,
  '18:00'::time,
  'Asia/Manila',
  true
FROM public.users u
LEFT JOIN public.clinic_members cm
  ON cm.user_id = u.id AND COALESCE(cm.is_active, true)
CROSS JOIN (VALUES (1), (3), (4)) AS d(dow)
WHERE u.primary_role = 'physician'::public.web_role
  AND COALESCE(u.is_active, true)
  AND NOT EXISTS (
    SELECT 1 FROM public.doctor_availability da WHERE da.doctor_id = u.id
  );

-- Dentist: Tue/Wed/Fri 10:00-18:00
INSERT INTO public.doctor_availability (
  clinic_id, doctor_id, day_of_week, start_time, end_time, timezone, is_active
)
SELECT
  COALESCE(cm.clinic_id, '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'::uuid),
  u.id,
  d.dow,
  '10:00'::time,
  '18:00'::time,
  'Asia/Manila',
  true
FROM public.users u
LEFT JOIN public.clinic_members cm
  ON cm.user_id = u.id AND COALESCE(cm.is_active, true)
CROSS JOIN (VALUES (2), (3), (5)) AS d(dow)
WHERE u.primary_role = 'dentist'::public.web_role
  AND COALESCE(u.is_active, true)
  AND NOT EXISTS (
    SELECT 1 FROM public.doctor_availability da WHERE da.doctor_id = u.id
  );

-- Nurse: mirror clinic open days Mon-Fri 07-21, Sat 07-19
INSERT INTO public.doctor_availability (
  clinic_id, doctor_id, day_of_week, start_time, end_time, timezone, is_active
)
SELECT
  COALESCE(cm.clinic_id, '34ad8ef3-74c6-4ac5-b64b-0fe28e6f848b'::uuid),
  u.id,
  d.dow,
  d.start_t,
  d.end_t,
  'Asia/Manila',
  true
FROM public.users u
LEFT JOIN public.clinic_members cm
  ON cm.user_id = u.id AND COALESCE(cm.is_active, true)
CROSS JOIN (
  VALUES
    (1, '07:00'::time, '21:00'::time),
    (2, '07:00'::time, '21:00'::time),
    (3, '07:00'::time, '21:00'::time),
    (4, '07:00'::time, '21:00'::time),
    (5, '07:00'::time, '21:00'::time),
    (6, '07:00'::time, '19:00'::time)
) AS d(dow, start_t, end_t)
WHERE u.primary_role = 'nurse'::public.web_role
  AND COALESCE(u.is_active, true)
  AND NOT EXISTS (
    SELECT 1 FROM public.doctor_availability da WHERE da.doctor_id = u.id
  );

-- ---------- RLS ----------
ALTER TABLE public.clinic_office_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_break_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_break_status ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.clinic_office_hours TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_office_hours TO authenticated;

GRANT SELECT ON public.clinic_break_status TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_break_status TO authenticated;

GRANT SELECT ON public.staff_break_status TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_break_status TO authenticated;

-- Clinic hours: public/mobile readable; admin writes
DROP POLICY IF EXISTS "clinic_hours_select_public" ON public.clinic_office_hours;
CREATE POLICY "clinic_hours_select_public"
  ON public.clinic_office_hours
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "clinic_hours_write_admin" ON public.clinic_office_hours;
CREATE POLICY "clinic_hours_write_admin"
  ON public.clinic_office_hours
  FOR ALL
  TO authenticated
  USING (public.is_clinic_admin())
  WITH CHECK (public.is_clinic_admin());

-- Clinic break: readable; nurse/admin write
DROP POLICY IF EXISTS "clinic_break_select_public" ON public.clinic_break_status;
CREATE POLICY "clinic_break_select_public"
  ON public.clinic_break_status
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "clinic_break_write_nurse_admin" ON public.clinic_break_status;
CREATE POLICY "clinic_break_write_nurse_admin"
  ON public.clinic_break_status
  FOR ALL
  TO authenticated
  USING (
    public.is_clinic_admin()
    OR public.has_clinic_role(
      clinic_id,
      ARRAY['nurse'::public.web_role, 'admin'::public.web_role]
    )
  )
  WITH CHECK (
    public.is_clinic_admin()
    OR public.has_clinic_role(
      clinic_id,
      ARRAY['nurse'::public.web_role, 'admin'::public.web_role]
    )
  );

-- Staff break: readable; own write or admin
DROP POLICY IF EXISTS "staff_break_select_public" ON public.staff_break_status;
CREATE POLICY "staff_break_select_public"
  ON public.staff_break_status
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "staff_break_write_own" ON public.staff_break_status;
CREATE POLICY "staff_break_write_own"
  ON public.staff_break_status
  FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_clinic_admin()
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_clinic_admin()
  );

-- Ensure doctor_availability is selectable for mobile (authenticated + anon read of active slots)
DROP POLICY IF EXISTS "availability_select_public" ON public.doctor_availability;
CREATE POLICY "availability_select_public"
  ON public.doctor_availability
  FOR SELECT
  TO anon, authenticated
  USING (COALESCE(is_active, true));

GRANT SELECT ON public.doctor_availability TO anon, authenticated;
