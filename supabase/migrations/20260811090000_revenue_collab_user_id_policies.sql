-- =====================================================
-- REVENUE: COLLABORATION USER ID HARDENING
-- Adds collaboration_with_user_id and moves permissions to UUID-based checks.
-- Keeps legacy full_name fallback for backward compatibility.
-- =====================================================

-- 1) Add stable collaboration user reference
ALTER TABLE public.revenue
ADD COLUMN IF NOT EXISTS collaboration_with_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.revenue.collaboration_with_user_id
IS 'Stable FK-like reference to collaboration partner (profiles.user_id/auth.users.id).';

CREATE INDEX IF NOT EXISTS idx_revenue_collaboration_with_user_id
ON public.revenue(collaboration_with_user_id);

-- 2) Backfill from full_name only where the name maps uniquely
WITH unique_profile_names AS (
  SELECT
    lower(btrim(full_name)) AS normalized_name,
    (array_agg(user_id))[1] AS user_id
  FROM public.profiles
  WHERE full_name IS NOT NULL
    AND btrim(full_name) <> ''
  GROUP BY lower(btrim(full_name))
  HAVING count(*) = 1
)
UPDATE public.revenue r
SET collaboration_with_user_id = u.user_id
FROM unique_profile_names u
WHERE r.collaboration_with_user_id IS NULL
  AND r.collaboration_with IS NOT NULL
  AND btrim(r.collaboration_with) <> ''
  AND lower(btrim(r.collaboration_with)) = u.normalized_name;

-- 3) Replace SELECT/UPDATE/DELETE policies with ID-first checks
DROP POLICY IF EXISTS "revenue_select_policy" ON public.revenue;
DROP POLICY IF EXISTS "Users can view their own revenue records" ON public.revenue;
DROP POLICY IF EXISTS "Users can view own revenue" ON public.revenue;

CREATE POLICY "revenue_select_policy"
ON public.revenue FOR SELECT
TO authenticated
USING (
  user_id::uuid = auth.uid()
  OR is_elevated_user()
  OR collaboration_with_user_id = auth.uid()
  OR (
    collaboration_with_user_id IS NULL
    AND collaboration_with = (SELECT full_name FROM public.profiles WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "revenue_update_policy" ON public.revenue;
DROP POLICY IF EXISTS "Users can update their own revenue records" ON public.revenue;
DROP POLICY IF EXISTS "Users can update own revenue" ON public.revenue;

CREATE POLICY "revenue_update_policy"
ON public.revenue FOR UPDATE
TO authenticated
USING (
  user_id::uuid = auth.uid()
  OR is_elevated_user()
  OR collaboration_with_user_id = auth.uid()
  OR (
    collaboration_with_user_id IS NULL
    AND collaboration_with = (SELECT full_name FROM public.profiles WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  user_id::uuid = auth.uid()
  OR is_elevated_user()
  OR collaboration_with_user_id = auth.uid()
  OR (
    collaboration_with_user_id IS NULL
    AND collaboration_with = (SELECT full_name FROM public.profiles WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "revenue_delete_policy" ON public.revenue;
DROP POLICY IF EXISTS "Users can delete their own revenue records" ON public.revenue;
DROP POLICY IF EXISTS "Users can delete own revenue" ON public.revenue;

CREATE POLICY "revenue_delete_policy"
ON public.revenue FOR DELETE
TO authenticated
USING (
  user_id::uuid = auth.uid()
  OR is_elevated_user()
  OR collaboration_with_user_id = auth.uid()
  OR (
    collaboration_with_user_id IS NULL
    AND collaboration_with = (SELECT full_name FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- 4) Verify relevant policies
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'revenue'
ORDER BY cmd, policyname;
