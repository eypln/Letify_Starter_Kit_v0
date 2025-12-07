-- Clean up all "_dup" suffixes from listing titles
-- This removes the duplicate markers added by previous migrations

UPDATE listings
SET title = REGEXP_REPLACE(title, '_dup[0-9]+$', '')
WHERE title LIKE '%_dup%';

-- Verify the cleanup - should return 0 after successful cleanup
SELECT COUNT(*) as remaining_dup_count
FROM listings
WHERE title LIKE '%_dup%';
