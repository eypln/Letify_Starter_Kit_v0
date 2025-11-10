-- Teamwork Listings table
CREATE TABLE IF NOT EXISTS teamwork_listings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  teamwork_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Listing data (only UI visible columns: City, Price, Bedroom, Bathroom, Property type, Description)
  city TEXT,
  price NUMERIC,
  bedroom INTEGER,
  bathroom INTEGER,
  property_type TEXT,
  description TEXT,
  
  -- Prevent duplicate sharing
  UNIQUE(listing_id, user_id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teamwork Clients table
CREATE TABLE IF NOT EXISTS teamwork_clients (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  teamwork_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Client data (copied from clients table, excluding name, phone, adding_date)
  people TEXT,
  bedroom TEXT,
  cities TEXT,
  family_sharing TEXT,
  nationalities TEXT,
  jobs TEXT,
  pet TEXT,
  budget TEXT,
  move_in TEXT,
  
  -- Prevent duplicate sharing
  UNIQUE(client_id, user_id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for teamwork_listings
ALTER TABLE teamwork_listings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view teamwork listings (shared by anyone)
CREATE POLICY "Allow all authenticated users to view teamwork listings"
  ON teamwork_listings
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own teamwork listings
CREATE POLICY "Users can insert their own teamwork listings"
  ON teamwork_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own teamwork listings
CREATE POLICY "Users can delete their own teamwork listings"
  ON teamwork_listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for teamwork_clients
ALTER TABLE teamwork_clients ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view teamwork clients (shared by anyone)
CREATE POLICY "Allow all authenticated users to view teamwork clients"
  ON teamwork_clients
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own teamwork clients
CREATE POLICY "Users can insert their own teamwork clients"
  ON teamwork_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own teamwork clients
CREATE POLICY "Users can delete their own teamwork clients"
  ON teamwork_clients
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teamwork_listings_user_id ON teamwork_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_teamwork_listings_listing_id ON teamwork_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_teamwork_listings_teamwork_date ON teamwork_listings(teamwork_date DESC);

CREATE INDEX IF NOT EXISTS idx_teamwork_clients_user_id ON teamwork_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_teamwork_clients_client_id ON teamwork_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_teamwork_clients_teamwork_date ON teamwork_clients(teamwork_date DESC);
