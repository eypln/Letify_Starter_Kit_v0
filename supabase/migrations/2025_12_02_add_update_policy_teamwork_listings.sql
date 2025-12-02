-- Add UPDATE policy for teamwork_listings
-- Allow authenticated users to update teamwork listings
-- This is needed so that when the original listing owner updates their listing,
-- all shared teamwork copies get updated automatically

-- Drop the policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to update teamwork listings" ON teamwork_listings;

-- Create the policy
CREATE POLICY "Allow authenticated users to update teamwork listings"
  ON teamwork_listings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON POLICY "Allow authenticated users to update teamwork listings" ON teamwork_listings IS 
  'Allows authenticated users to update teamwork listings when the original listing is updated';
