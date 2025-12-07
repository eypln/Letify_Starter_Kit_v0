-- Remove unique constraint from listings.title
-- This allows multiple users to add the same property with the same reference number

-- Drop the unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'listings_title_unique'
  ) THEN
    ALTER TABLE listings DROP CONSTRAINT listings_title_unique;
    RAISE NOTICE 'Dropped unique constraint on listings.title';
  ELSE
    RAISE NOTICE 'Unique constraint does not exist, skipping';
  END IF;
END $$;

-- Keep the index for performance (non-unique)
-- If the unique index exists, replace it with a non-unique one
DROP INDEX IF EXISTS listings_title_unique;
CREATE INDEX IF NOT EXISTS idx_listings_title ON listings(title);
