-- Fix infinite recursion on public.users UPDATE policy after profiles→users rename.
-- WITH CHECK must not re-select from public.users under RLS.

CREATE OR REPLACE FUNCTION public.current_user_row()
RETURNS TABLE (
  email text,
  primary_role public.web_role,
  is_active boolean,
  invite_pending boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.email, u.primary_role, u.is_active, u.invite_pending
  FROM public.users u
  WHERE u.id = (SELECT auth.uid())
$function$;

REVOKE ALL ON FUNCTION public.current_user_row() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_row() TO authenticated;

DROP POLICY IF EXISTS users_update_own_safe_fields ON public.users;
CREATE POLICY users_update_own_safe_fields
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND email = (SELECT r.email FROM public.current_user_row() r)
    AND primary_role = (SELECT r.primary_role FROM public.current_user_row() r)
    AND is_active = (SELECT r.is_active FROM public.current_user_row() r)
    AND (
      invite_pending = false
      OR invite_pending = (SELECT r.invite_pending FROM public.current_user_row() r)
    )
  );
