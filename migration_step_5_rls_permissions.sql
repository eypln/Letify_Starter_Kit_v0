-- STEP 5: Setup RLS and permissions
-- Run this after step 4

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_listings_title ON listings(title);

-- Enable RLS on listing_sequence
ALTER TABLE listing_sequence ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can read listing sequence" ON listing_sequence;

-- Allow authenticated users to read the sequence
CREATE POLICY "Anyone can read listing sequence"
ON listing_sequence
FOR SELECT
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT SELECT ON listing_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_listing_reference() TO authenticated;

-- Verify everything is set up
SELECT 
  'Table exists' as check_type,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'listing_sequence') as status
UNION ALL
SELECT 
  'Function exists',
  EXISTS (SELECT FROM pg_proc WHERE proname = 'get_next_listing_reference')
UNION ALL
SELECT 
  'Unique constraint',
  EXISTS (SELECT FROM pg_constraint WHERE conname = 'listings_title_unique')
UNION ALL
SELECT 
  'Index exists',
  EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_listings_title')
UNION ALL
SELECT 
  'RLS enabled',
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'listing_sequence');
