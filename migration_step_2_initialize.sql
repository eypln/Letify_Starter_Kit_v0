-- STEP 2: Initialize sequence with current max number
-- Run this after step 1

DO $$
DECLARE
  max_ref INTEGER;
BEGIN
  -- Find the highest existing manual reference number (L1, L2, L3, etc.)
  SELECT COALESCE(MAX(CAST(SUBSTRING(title FROM 2) AS INTEGER)), 0)
  INTO max_ref
  FROM listings
  WHERE title ~ '^L[0-9]+$';
  
  RAISE NOTICE 'Found max reference number: L%', max_ref;
  
  -- Insert or update the sequence starting point
  INSERT INTO listing_sequence (id, current_number, updated_at)
  VALUES (1, max_ref, NOW())
  ON CONFLICT (id) 
  DO UPDATE SET current_number = max_ref, updated_at = NOW();
  
  RAISE NOTICE 'Initialized sequence to: %', max_ref;
END $$;

-- Verify the initialization
SELECT * FROM listing_sequence;
