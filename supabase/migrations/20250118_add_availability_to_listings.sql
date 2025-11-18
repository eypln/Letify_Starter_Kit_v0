-- Add availability column to listings table
-- This column tracks the availability status of each listing
-- Available (green), Rented (red), Soon (blue)

DO $$ 
BEGIN
  -- Create enum type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_status') THEN
    CREATE TYPE availability_status AS ENUM ('Available', 'Rented', 'Soon');
  END IF;
END $$;

-- Add availability column to listings table with default value 'Available'
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS availability availability_status DEFAULT 'Available';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_availability ON listings(availability);

-- Comment for documentation
COMMENT ON COLUMN listings.availability IS 'Availability status: Available (green), Rented (red), Soon (blue)';
