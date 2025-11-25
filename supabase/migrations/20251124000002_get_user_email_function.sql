-- =========================================================================
-- Function: get_user_email - Fetch email from auth.users for admins
-- =========================================================================
-- This function allows admins to fetch user emails from auth.users table
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_user_email(user_uuid UUID)
RETURNS TABLE (email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can access user emails';
  END IF;

  -- Return email from auth.users
  RETURN QUERY
  SELECT au.email::TEXT
  FROM auth.users au
  WHERE au.id = user_uuid;
END;
$$;

-- Grant execute to authenticated users (function will check if admin internally)
GRANT EXECUTE ON FUNCTION public.get_user_email(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_user_email(UUID) IS 'Returns user email from auth.users. Only accessible by admins.';
