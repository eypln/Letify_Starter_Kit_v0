-- Migration: Global Listing Reference Number Sequence
-- This ensures all users use the same sequential numbering system (L1, L2, L3, etc.)
-- and prevents duplicate reference numbers

-- 1. Create listing_sequence table to store the current sequence number
CREATE TABLE IF NOT EXISTS listing_sequence (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Initialize the sequence with the current maximum number from existing listings
DO $$
DECLARE
  max_ref INTEGER;
BEGIN
  -- Find the highest existing manual reference number (L1, L2, L3, etc.)
  SELECT COALESCE(MAX(CAST(SUBSTRING(title FROM 2) AS INTEGER)), 0)
  INTO max_ref
  FROM listings
  WHERE title ~ '^L[0-9]+$';
  
  -- Insert or update the sequence starting point
  INSERT INTO listing_sequence (id, current_number, updated_at)
  VALUES (1, max_ref, NOW())
  ON CONFLICT (id) 
  DO UPDATE SET current_number = max_ref, updated_at = NOW();
END $$;

-- 3. Create function to get next reference number atomically
CREATE OR REPLACE FUNCTION get_next_listing_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Atomically increment and return the next number
  UPDATE listing_sequence
  SET current_number = current_number + 1,
      updated_at = NOW()
  WHERE id = 1
  RETURNING current_number INTO next_num;
  
  -- Return formatted reference (e.g., "L123")
  RETURN 'L' || next_num::TEXT;
END;
$$;

-- 4. Drop unique constraint from listings.title (if exists)
-- We allow duplicate reference numbers because multiple users can add the same property
DO $$
BEGIN
  -- Drop existing unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_title_unique'
  ) THEN
    ALTER TABLE listings DROP CONSTRAINT listings_title_unique;
    RAISE NOTICE 'Dropped unique constraint on listings.title - duplicates are now allowed';
  ELSE
    RAISE NOTICE 'No unique constraint found on listings.title';
  END IF;
END $$;

-- 5. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_listings_title ON listings(title);

-- 6. Enable RLS on listing_sequence (optional, for security)
ALTER TABLE listing_sequence ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can read listing sequence" ON listing_sequence;

-- Allow authenticated users to read the sequence
CREATE POLICY "Anyone can read listing sequence"
ON listing_sequence
FOR SELECT
TO authenticated
USING (true);

-- Only allow the get_next_listing_reference function to update
-- (This is handled by SECURITY DEFINER in the function)

-- Grant necessary permissions
GRANT SELECT ON listing_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_listing_reference() TO authenticated;

COMMENT ON TABLE listing_sequence IS 'Stores the global sequence counter for listing reference numbers (L1, L2, L3, etc.)';
COMMENT ON FUNCTION get_next_listing_reference() IS 'Atomically gets the next listing reference number and increments the counter';
