-- =====================================================
-- FIX REVENUE INSERT RLS POLICY FOR TEAMLEADER/MANAGER/BOSS
-- Allows elevated users to insert revenue on behalf of agents
-- =====================================================

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "revenue_insert_policy" ON revenue;
DROP POLICY IF EXISTS "Users can insert own revenue" ON revenue;
DROP POLICY IF EXISTS "Users can insert their own revenue records" ON revenue;

-- Create new INSERT policy that allows:
-- 1. Users to insert their own revenue (user_id = auth.uid())
-- 2. Teamleaders/managers/bosses/admins to insert revenue for ANY user
CREATE POLICY "revenue_insert_policy"
ON revenue FOR INSERT
TO authenticated
WITH CHECK (
  user_id::uuid = auth.uid() OR is_elevated_user()
);

-- Also fix UPDATE policy to allow elevated users to reassign deals
DROP POLICY IF EXISTS "revenue_update_policy" ON revenue;
DROP POLICY IF EXISTS "Users can update their own revenue records" ON revenue;
DROP POLICY IF EXISTS "Users can update own revenue" ON revenue;

CREATE POLICY "revenue_update_policy"
ON revenue FOR UPDATE
TO authenticated
USING (
  user_id::uuid = auth.uid() OR is_elevated_user()
)
WITH CHECK (
  -- Allow elevated users to change user_id (reassign deals)
  is_elevated_user() OR user_id::uuid = auth.uid()
);

-- Verify updated policies
SELECT 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'revenue'
ORDER BY cmd, policyname;
