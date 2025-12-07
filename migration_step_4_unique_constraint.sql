-- STEP 4: Handle duplicates and add unique constraint
-- Run this after step 3

-- First, check for duplicates
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT title, COUNT(*) as cnt
    FROM listings
    WHERE title ~ '^L[0-9]+$'
    GROUP BY title
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Found % duplicate title groups', duplicate_count;
  
  -- If duplicates exist, rename them
  IF duplicate_count > 0 THEN
    WITH ranked_duplicates AS (
      SELECT id, title, 
             ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at) as rn
      FROM listings
      WHERE title ~ '^L[0-9]+$'
    )
    UPDATE listings
    SET title = ranked_duplicates.title || '_dup' || ranked_duplicates.rn
    FROM ranked_duplicates
    WHERE listings.id = ranked_duplicates.id 
      AND ranked_duplicates.rn > 1;
    
    RAISE NOTICE 'Renamed duplicate titles';
  END IF;
END $$;

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_title_unique'
  ) THEN
    ALTER TABLE listings DROP CONSTRAINT listings_title_unique;
    RAISE NOTICE 'Dropped existing unique constraint';
  END IF;
END $$;

-- Add the unique constraint
ALTER TABLE listings 
ADD CONSTRAINT listings_title_unique UNIQUE (title);

RAISE NOTICE 'Added unique constraint to listings.title';
