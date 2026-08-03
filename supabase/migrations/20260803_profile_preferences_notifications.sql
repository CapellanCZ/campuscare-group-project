-- Profile fields, user preferences (notifications + theme), and staff notifications inbox.

-- ---------------------------------------------------------------------------
-- 1) Extend users with staff profile fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS department text DEFAULT 'Health Services Office';

UPDATE public.users
SET department = COALESCE(NULLIF(btrim(department), ''), 'Health Services Office')
WHERE department IS NULL OR btrim(department) = '';

COMMENT ON COLUMN public.users.employee_id IS 'Campus employee / staff ID';
COMMENT ON COLUMN public.users.license_number IS 'Professional license number (physicians/dentists)';
COMMENT ON COLUMN public.users.department IS 'Department display name';

-- ---------------------------------------------------------------------------
-- 2) User preferences (notification toggles + theme)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  notify_consultation_requests boolean NOT NULL DEFAULT true,
  notify_queue boolean NOT NULL DEFAULT true,
  notify_announcements boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own preferences" ON public.user_preferences;
CREATE POLICY "users select own preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users insert own preferences" ON public.user_preferences;
CREATE POLICY "users insert own preferences"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users update own preferences" ON public.user_preferences;
CREATE POLICY "users update own preferences"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Notifications inbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('consultation_request', 'queue', 'announcement')),
  title text NOT NULL,
  body text NOT NULL,
  href text,
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users select own notifications" ON public.notifications;
CREATE POLICY "users select own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
CREATE POLICY "users update own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Inserts are typically from service role / SECURITY DEFINER helpers.
DROP POLICY IF EXISTS "users insert own notifications" ON public.notifications;
CREATE POLICY "users insert own notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Helper: create notification for eligible staff (respects preferences)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_staff_notifications(
  p_type text,
  p_title text,
  p_body text,
  p_href text DEFAULT NULL,
  p_roles public.web_role[] DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_count integer := 0;
  pref_col text;
BEGIN
  IF p_type NOT IN ('consultation_request', 'queue', 'announcement') THEN
    RAISE EXCEPTION 'invalid notification type: %', p_type;
  END IF;

  pref_col := CASE p_type
    WHEN 'consultation_request' THEN 'notify_consultation_requests'
    WHEN 'queue' THEN 'notify_queue'
    WHEN 'announcement' THEN 'notify_announcements'
  END;

  INSERT INTO public.notifications (user_id, type, title, body, href, metadata)
  SELECT
    u.id,
    p_type,
    p_title,
    p_body,
    p_href,
    COALESCE(p_metadata, '{}'::jsonb)
  FROM public.users u
  LEFT JOIN public.user_preferences pref ON pref.user_id = u.id
  WHERE u.is_active = true
    AND u.primary_role IN (
      'admin'::public.web_role,
      'nurse'::public.web_role,
      'physician'::public.web_role,
      'dentist'::public.web_role
    )
    AND (
      p_roles IS NULL
      OR u.primary_role = ANY (p_roles)
    )
    AND (
      CASE pref_col
        WHEN 'notify_consultation_requests' THEN COALESCE(pref.notify_consultation_requests, true)
        WHEN 'notify_queue' THEN COALESCE(pref.notify_queue, true)
        WHEN 'notify_announcements' THEN COALESCE(pref.notify_announcements, true)
        ELSE true
      END
    );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_staff_notifications(text, text, text, text, public.web_role[], jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_staff_notifications(text, text, text, text, public.web_role[], jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Triggers: consultation request → nurse notifications
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_consultation_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    PERFORM public.create_staff_notifications(
      'consultation_request',
      'New consultation request',
      COALESCE(NEW.patient_name, 'A patient') || ' requested ' || COALESCE(NEW.service, 'a consultation'),
      '/nurse/requests',
      ARRAY['nurse'::public.web_role, 'admin'::public.web_role],
      jsonb_build_object('request_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consultation_requests_notify_insert ON public.consultation_requests;
CREATE TRIGGER consultation_requests_notify_insert
  AFTER INSERT ON public.consultation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_consultation_request();

-- ---------------------------------------------------------------------------
-- 6) Triggers: announcements → staff notifications
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_announcement_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  roles public.web_role[];
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    roles := CASE lower(COALESCE(NEW.audience, 'all'))
      WHEN 'nurse' THEN ARRAY['nurse'::public.web_role]
      WHEN 'physician' THEN ARRAY['physician'::public.web_role]
      WHEN 'dentist' THEN ARRAY['dentist'::public.web_role]
      WHEN 'faculty' THEN ARRAY['admin'::public.web_role, 'nurse'::public.web_role, 'physician'::public.web_role, 'dentist'::public.web_role]
      ELSE NULL
    END;

    PERFORM public.create_staff_notifications(
      'announcement',
      'New announcement',
      COALESCE(NEW.title, 'A clinic notice was published'),
      '/announcements',
      roles,
      jsonb_build_object('announcement_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcements_notify_publish ON public.announcements;
CREATE TRIGGER announcements_notify_publish
  AFTER INSERT OR UPDATE OF status ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_announcement_publish();

-- ---------------------------------------------------------------------------
-- 7) Triggers: queue updates → relevant station staff
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_queue_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  roles public.web_role[];
  label text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       OLD.status IS DISTINCT FROM NEW.status
       OR OLD.station IS DISTINCT FROM NEW.station
     )
     AND NEW.status IN ('waiting', 'called') THEN
    roles := CASE NEW.station
      WHEN 'nurse' THEN ARRAY['nurse'::public.web_role, 'admin'::public.web_role]
      WHEN 'physician' THEN ARRAY['physician'::public.web_role, 'nurse'::public.web_role]
      WHEN 'dentist' THEN ARRAY['dentist'::public.web_role, 'nurse'::public.web_role]
      ELSE ARRAY['nurse'::public.web_role, 'admin'::public.web_role]
    END;

    label := CASE NEW.status
      WHEN 'called' THEN 'Patient called'
      ELSE 'Queue update'
    END;

    PERFORM public.create_staff_notifications(
      'queue',
      label,
      COALESCE(NEW.patient_name, 'A patient') || ' · ticket ' || COALESCE(NEW.ticket_code, NEW.queue_number::text, '—'),
      CASE NEW.station
        WHEN 'physician' THEN '/physician/queue'
        WHEN 'dentist' THEN '/dentist/queue'
        ELSE '/nurse/queue'
      END,
      roles,
      jsonb_build_object('ticket_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS health_queue_tickets_notify_update ON public.health_queue_tickets;
CREATE TRIGGER health_queue_tickets_notify_update
  AFTER UPDATE OF status, station ON public.health_queue_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_queue_update();
