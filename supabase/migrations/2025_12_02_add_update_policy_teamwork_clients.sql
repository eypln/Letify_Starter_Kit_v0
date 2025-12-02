-- Add UPDATE policy for teamwork_clients
-- Allow authenticated users to update teamwork clients
-- This is needed so that when the original client owner updates their client,
-- all shared teamwork copies get updated automatically

-- Drop the policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to update teamwork clients" ON teamwork_clients;

-- Create the policy
CREATE POLICY "Allow authenticated users to update teamwork clients"
  ON teamwork_clients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON POLICY "Allow authenticated users to update teamwork clients" ON teamwork_clients IS 
  'Allows authenticated users to update teamwork clients when the original client is updated';
