-- queue_display is app-level only; it is not a web_role enum value.
-- Creating/publishing announcements failed because create_staff_notifications
-- cast 'queue_display'::web_role inside the announcement notify trigger.

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
