-- Add deal_type column to revenue table
-- This supports Longlet and Shortlet rental calculation types

-- Add deal_type enum type
DO $$ BEGIN
    CREATE TYPE deal_type AS ENUM ('longlet', 'shortlet');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add deal_type column with default 'longlet' for backward compatibility
ALTER TABLE public.revenue 
ADD COLUMN IF NOT EXISTS deal_type deal_type DEFAULT 'longlet' NOT NULL;

-- Create index for faster filtering by deal_type
CREATE INDEX IF NOT EXISTS idx_revenue_deal_type ON public.revenue(deal_type);

-- Add comment to document the column
COMMENT ON COLUMN public.revenue.deal_type IS 'Type of rental deal: longlet (standard) or shortlet (short-term)';
