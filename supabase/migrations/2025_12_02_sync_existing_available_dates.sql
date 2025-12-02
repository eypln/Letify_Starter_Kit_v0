-- Update existing teamwork_listings with available_date from listings table
UPDATE public.teamwork_listings tl
SET available_date = l.available_date
FROM public.listings l
WHERE tl.listing_id = l.id
  AND l.available_date IS NOT NULL;
