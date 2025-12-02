-- Add available_date column to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS available_date DATE;

-- Add comment to column
COMMENT ON COLUMN public.listings.available_date IS 'The date when the property will be available for rent';
