-- Fix teamwork DELETE policies to allow elevated users (teamleader, manager, boss, admin)
-- to remove any teamwork entry, not just their own

-- Drop existing DELETE policies
DROP POLICY IF EXISTS "Users can delete their own teamwork listings" ON teamwork_listings;
DROP POLICY IF EXISTS "Users can delete their own teamwork clients" ON teamwork_clients;

-- Recreate with elevated user support
CREATE POLICY "Users can delete their own teamwork listings"
  ON teamwork_listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR is_elevated_user());

CREATE POLICY "Users can delete their own teamwork clients"
  ON teamwork_clients
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR is_elevated_user());
