-- Add fb_token_updated_at column to track Facebook token expiry
-- Facebook tokens expire after 60 days, so we need to remind users to refresh

ALTER TABLE public.users_integrations 
ADD COLUMN IF NOT EXISTS fb_token_updated_at TIMESTAMPTZ;

-- Update existing records to set initial value
UPDATE public.users_integrations 
SET fb_token_updated_at = updated_at 
WHERE fb_access_token IS NOT NULL AND fb_token_updated_at IS NULL;

-- Create a trigger to automatically update fb_token_updated_at when fb_access_token changes
CREATE OR REPLACE FUNCTION update_fb_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- If fb_access_token changed, update the timestamp
  IF NEW.fb_access_token IS DISTINCT FROM OLD.fb_access_token THEN
    NEW.fb_token_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_fb_token_updated ON public.users_integrations;
CREATE TRIGGER trg_fb_token_updated
  BEFORE UPDATE ON public.users_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_fb_token_timestamp();

-- Add comment
COMMENT ON COLUMN public.users_integrations.fb_token_updated_at IS 'Last time Facebook access token was updated. Used to remind users before 60-day expiry.';
