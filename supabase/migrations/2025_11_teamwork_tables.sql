-- Teamwork listings table
CREATE TABLE IF NOT EXISTS teamwork_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  -- Fields from listings (excluding Source URL, Reference No, FB Post, FB Reels, Adding date)
  property_title TEXT NOT NULL,
  property_address TEXT,
  property_type TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_meters DECIMAL,
  price DECIMAL,
  description TEXT,
  images JSONB,
  status TEXT,
  -- Teamwork specific
  teamwork_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teamwork clients table
CREATE TABLE IF NOT EXISTS teamwork_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  -- Fields from clients (excluding Name, Phone, adding date)
  email TEXT,
  location TEXT,
  client_type TEXT,
  status TEXT,
  notes TEXT,
  metadata JSONB,
  -- Teamwork specific
  teamwork_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_teamwork_listings_user_id ON teamwork_listings(user_id);
CREATE INDEX idx_teamwork_listings_agent_user_id ON teamwork_listings(agent_user_id);
CREATE INDEX idx_teamwork_clients_user_id ON teamwork_clients(user_id);
CREATE INDEX idx_teamwork_clients_agent_user_id ON teamwork_clients(agent_user_id);

-- RLS policies
ALTER TABLE teamwork_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teamwork_clients ENABLE ROW LEVEL SECURITY;

-- Teamwork Listings - user can see listings shared with them and their own
CREATE POLICY "Users can view teamwork listings shared with them"
  ON teamwork_listings
  FOR SELECT
  USING (user_id = auth.uid() OR agent_user_id = auth.uid());

CREATE POLICY "Users can insert teamwork listings"
  ON teamwork_listings
  FOR INSERT
  WITH CHECK (agent_user_id = auth.uid());

-- Teamwork Clients - user can see clients shared with them and their own
CREATE POLICY "Users can view teamwork clients shared with them"
  ON teamwork_clients
  FOR SELECT
  USING (user_id = auth.uid() OR agent_user_id = auth.uid());

CREATE POLICY "Users can insert teamwork clients"
  ON teamwork_clients
  FOR INSERT
  WITH CHECK (agent_user_id = auth.uid());
