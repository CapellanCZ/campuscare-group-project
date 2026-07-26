-- Track re-invites separately from auth.last_sign_in_at so deactivate + resend shows Invited.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invite_pending boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.invite_pending IS
  'True after invite/re-invite until the user completes a successful sign-in.';

-- Backfill: active accounts that have never signed in are still pending invites.
UPDATE public.profiles p
SET invite_pending = true
FROM auth.users u
WHERE u.id = p.id
  AND p.is_active = true
  AND u.last_sign_in_at IS NULL;

-- Own-row updates may clear invite_pending on sign-in, but cannot set it true.
DROP POLICY IF EXISTS profiles_update_own_safe_fields ON public.profiles;

CREATE POLICY profiles_update_own_safe_fields
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND email = (SELECT p.email FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
    AND primary_role = (SELECT p.primary_role FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
    AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
    AND (
      invite_pending = false
      OR invite_pending = (
        SELECT p.invite_pending FROM public.profiles p WHERE p.id = (SELECT auth.uid())
      )
    )
  );

-- New auth users start as invite-pending until first successful sign-in.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  role_text text;
  resolved_role public.web_role;
  resolved_name text;
BEGIN
  role_text := lower(trim(COALESCE(
    NEW.raw_app_meta_data ->> 'primary_role',
    NEW.raw_user_meta_data ->> 'primary_role',
    ''
  )));

  IF role_text = 'doctor' THEN
    role_text := 'physician';
  END IF;

  IF role_text IN ('admin', 'nurse', 'physician', 'dentist') THEN
    resolved_role := role_text::public.web_role;
  ELSE
    resolved_role := 'clinic_staff'::public.web_role;
  END IF;

  resolved_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(SPLIT_PART(NEW.email, '@', 1)), ''),
    'Staff user'
  );

  INSERT INTO public.profiles (id, full_name, email, primary_role, is_active, invite_pending)
  VALUES (NEW.id, resolved_name, NEW.email, resolved_role, true, true)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    primary_role = CASE
      WHEN EXCLUDED.primary_role IN (
        'admin'::public.web_role,
        'nurse'::public.web_role,
        'physician'::public.web_role,
        'dentist'::public.web_role
      ) THEN EXCLUDED.primary_role
      ELSE public.profiles.primary_role
    END,
    updated_at = now();

  RETURN NEW;
END;
$function$;
