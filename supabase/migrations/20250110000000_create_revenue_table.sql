-- Create revenue table
CREATE TABLE IF NOT EXISTS public.revenue (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ref_no TEXT,
    client_name TEXT,
    rent_amount NUMERIC(10, 2),
    landlord_fee NUMERIC(10, 2),
    landlord_discount BOOLEAN DEFAULT FALSE,
    client_fee NUMERIC(10, 2),
    client_discount BOOLEAN DEFAULT FALSE,
    listing_fee NUMERIC(10, 2),
    has_listing_fee BOOLEAN DEFAULT FALSE,
    agent_income NUMERIC(10, 2),
    agent_tax NUMERIC(10, 2) DEFAULT 0,
    vatable BOOLEAN DEFAULT TRUE,
    date_rented TIMESTAMPTZ,
    date_signed TIMESTAMPTZ,
    date_move_in TIMESTAMPTZ,
    landlord_paid_date TIMESTAMPTZ,
    client_paid_date TIMESTAMPTZ,
    collaboration_with TEXT,
    inform_boss_after_both_sides_paid BOOLEAN DEFAULT FALSE,
    boss_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for revenue table
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;

-- Users can view their own revenue records
CREATE POLICY "Users can view their own revenue records"
    ON public.revenue
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own revenue records
CREATE POLICY "Users can insert their own revenue records"
    ON public.revenue
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own revenue records
CREATE POLICY "Users can update their own revenue records"
    ON public.revenue
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own revenue records
CREATE POLICY "Users can delete their own revenue records"
    ON public.revenue
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_revenue_user_id ON public.revenue(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_created_at ON public.revenue(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_revenue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER revenue_updated_at
    BEFORE UPDATE ON public.revenue
    FOR EACH ROW
    EXECUTE FUNCTION update_revenue_updated_at();
