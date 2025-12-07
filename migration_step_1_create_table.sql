-- STEP 1: Create listing_sequence table
-- Run this first

CREATE TABLE IF NOT EXISTS listing_sequence (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

COMMENT ON TABLE listing_sequence IS 'Stores the global sequence counter for listing reference numbers (L1, L2, L3, etc.)';
