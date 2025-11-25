-- =========================================================================
-- FIX: Admin RLS Policies - Allow admins to view all approval queue
-- =========================================================================
-- Problem: Admin cannot see pending users in approval_queue
-- Root Cause: RLS policies only allow users to see their own entries
-- Solution: Add policy for admins to view all entries
-- =========================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "admin_view_all_approvals" ON public.approval_queue;
DROP POLICY IF EXISTS "admin_update_all_approvals" ON public.approval_queue;
DROP POLICY IF EXISTS "admin_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON public.profiles;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

-- Policy: Admins can view ALL entries in approval_queue
CREATE POLICY "admin_view_all_approvals"
ON public.approval_queue
FOR SELECT
USING (
  -- User is admin OR viewing their own entry
  public.is_admin() OR auth.uid() = user_id
);

-- Policy: Admins can update ALL entries in approval_queue
CREATE POLICY "admin_update_all_approvals"
ON public.approval_queue
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy: Admins can view ALL profiles (needed for pending-users API)
CREATE POLICY "admin_view_all_profiles"
ON public.profiles
FOR SELECT
USING (
  -- User is admin OR viewing their own profile
  public.is_admin() OR auth.uid() = user_id
);

-- Policy: Admins can update any profile status
-- Note: Regular users can only update their own profile (role/status changes blocked by app logic)
CREATE POLICY "admin_update_all_profiles"
ON public.profiles
FOR UPDATE
USING (
  -- User is admin OR updating their own profile
  public.is_admin() OR auth.uid() = user_id
)
WITH CHECK (
  -- Admins can change anything
  -- Regular users can update their own (role/status protection handled at application level)
  public.is_admin() OR auth.uid() = user_id
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =========================================================================
-- Verification Query
-- =========================================================================
-- SELECT 
--   schemaname, 
--   tablename, 
--   policyname, 
--   cmd,
--   qual
-- FROM pg_policies
-- WHERE tablename IN ('approval_queue', 'profiles')
--   AND schemaname = 'public'
-- ORDER BY tablename, policyname;
