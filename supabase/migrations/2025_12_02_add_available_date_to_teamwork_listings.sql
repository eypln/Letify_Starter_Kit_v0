-- Add available_date column to teamwork_listings table
ALTER TABLE public.teamwork_listings 
ADD COLUMN IF NOT EXISTS available_date DATE;

-- Add comment to column
COMMENT ON COLUMN public.teamwork_listings.available_date IS 'The date when the property will be available for rent (copied from listings table)';
