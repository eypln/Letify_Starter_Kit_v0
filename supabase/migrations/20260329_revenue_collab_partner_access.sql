-- =====================================================
-- REVENUE: COLLABORATION PARTNER ACCESS
-- Allows collaboration partners to view and edit deals
-- where they are listed in collaboration_with field
-- =====================================================

-- Step 1: Update SELECT policy to include collaboration partners
DROP POLICY IF EXISTS "revenue_select_policy" ON revenue;
DROP POLICY IF EXISTS "Users can view their own revenue records" ON revenue;
DROP POLICY IF EXISTS "Users can view own revenue" ON revenue;

CREATE POLICY "revenue_select_policy"
ON revenue FOR SELECT
TO authenticated
USING (
  user_id::uuid = auth.uid()
  OR is_elevated_user()
  OR collaboration_with = (SELECT full_name FROM profiles WHERE user_id = auth.uid())
);

-- Step 2: Update UPDATE policy to include collaboration partners
DROP POLICY IF EXISTS "revenue_update_policy" ON revenue;
DROP POLICY IF EXISTS "Users can update their own revenue records" ON revenue;
DROP POLICY IF EXISTS "Users can update own revenue" ON revenue;

CREATE POLICY "revenue_update_policy"
ON revenue FOR UPDATE
TO authenticated
USING (
  user_id::uuid = auth.uid()
  OR is_elevated_user()
  OR collaboration_with = (SELECT full_name FROM profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  user_id::uuid = auth.uid()
  OR is_elevated_user()
  OR collaboration_with = (SELECT full_name FROM profiles WHERE user_id = auth.uid())
);

-- Step 3: Update DELETE policy to include collaboration partners and elevated users
DROP POLICY IF EXISTS "revenue_delete_policy" ON revenue;
DROP POLICY IF EXISTS "Users can delete their own revenue records" ON revenue;
DROP POLICY IF EXISTS "Users can delete own revenue" ON revenue;

CREATE POLICY "revenue_delete_policy"
ON revenue FOR DELETE
TO authenticated
USING (
  user_id::uuid = auth.uid()
  OR is_elevated_user()
  OR collaboration_with = (SELECT full_name FROM profiles WHERE user_id = auth.uid())
);

-- Step 4: Verify policies
SELECT 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'revenue'
ORDER BY cmd, policyname;
