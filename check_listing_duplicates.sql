-- Check for duplicate listing titles before running migration
-- Run this first to see if there are any issues

-- 1. Check for duplicate L-numbered titles
SELECT 
  title, 
  COUNT(*) as duplicate_count,
  STRING_AGG(id::TEXT, ', ') as listing_ids
FROM listings
WHERE title ~ '^L[0-9]+$'
GROUP BY title
HAVING COUNT(*) > 1
ORDER BY title;

-- 2. Check total count of L-numbered listings
SELECT COUNT(*) as total_l_listings
FROM listings
WHERE title ~ '^L[0-9]+$';

-- 3. Find the highest L number currently in use
SELECT 
  title,
  CAST(SUBSTRING(title FROM 2) AS INTEGER) as number_part
FROM listings
WHERE title ~ '^L[0-9]+$'
ORDER BY CAST(SUBSTRING(title FROM 2) AS INTEGER) DESC
LIMIT 10;

-- 4. Check if listing_sequence table already exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'listing_sequence'
) as sequence_table_exists;

-- 5. Check if the function already exists
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'get_next_listing_reference'
) as function_exists;

-- 6. Check if unique constraint exists
SELECT EXISTS (
  SELECT FROM pg_constraint 
  WHERE conname = 'listings_title_unique'
) as unique_constraint_exists;
