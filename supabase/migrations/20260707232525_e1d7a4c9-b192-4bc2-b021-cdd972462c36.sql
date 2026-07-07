
-- Replace the SECURITY DEFINER helper with a JWT-based check so RLS no longer
-- needs a callable definer function.
DROP POLICY "View profiles in same domain" ON public.profiles;
DROP FUNCTION IF EXISTS public.current_user_email_domain();

CREATE POLICY "View profiles in same domain"
ON public.profiles FOR SELECT
TO authenticated
USING (
  email_domain IS NOT NULL
  AND email_domain = lower(split_part(auth.jwt() ->> 'email', '@', 2))
);

-- handle_new_user must remain SECURITY DEFINER (trigger on auth.users),
-- but nothing outside the trigger should call it.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
