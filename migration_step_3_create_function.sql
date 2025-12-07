-- STEP 3: Create the function
-- Run this after step 2

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

COMMENT ON FUNCTION get_next_listing_reference() IS 'Atomically gets the next listing reference number and increments the counter';

-- Test the function
SELECT get_next_listing_reference() as test_reference;
