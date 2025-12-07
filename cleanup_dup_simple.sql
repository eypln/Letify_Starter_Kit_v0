-- Simple cleanup - remove all _dup suffixes

UPDATE listings
SET title = 
  CASE 
    WHEN title LIKE '%_dup2' THEN REPLACE(title, '_dup2', '')
    WHEN title LIKE '%_dup3' THEN REPLACE(title, '_dup3', '')
    WHEN title LIKE '%_dup4' THEN REPLACE(title, '_dup4', '')
    WHEN title LIKE '%_dup5' THEN REPLACE(title, '_dup5', '')
    ELSE title
  END
WHERE title LIKE '%_dup%';

-- Check results
SELECT title FROM listings WHERE title LIKE '%_dup%';
