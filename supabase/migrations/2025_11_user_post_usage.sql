-- Create user_post_usage table to track monthly post counts
CREATE TABLE IF NOT EXISTS user_post_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, month)
);

-- Create index for faster queries
CREATE INDEX idx_user_post_usage_user_month ON user_post_usage(user_id, month);

-- Enable RLS
ALTER TABLE user_post_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own post usage
CREATE POLICY "Users can view their own post usage" 
  ON user_post_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Only the server (via service_role) or the user can insert/update
CREATE POLICY "Users can insert/update their own post usage"
  ON user_post_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own post usage"
  ON user_post_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_post_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_post_usage TO service_role;
