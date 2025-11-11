-- Advanced Analytics Tables and RLS Policies
-- Migration: 2025_12_advanced_analytics

-- Analytics Events Table - Track user interactions and feature usage
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT event_type_check CHECK (event_type IN (
    'post_created', 'post_viewed', 'post_deleted',
    'listing_created', 'listing_viewed', 'listing_deleted',
    'client_added', 'client_viewed', 'client_updated',
    'viewing_scheduled', 'viewing_completed', 'viewing_cancelled',
    'revenue_recorded', 'revenue_updated', 'revenue_deleted',
    'teamwork_shared', 'teamwork_removed',
    'subscription_upgraded', 'subscription_downgraded',
    'credits_purchased', 'credits_used',
    'export_generated', 'report_viewed',
    'email_sent', 'notification_received'
  )),
  CONSTRAINT event_category_check CHECK (event_category IN (
    'posts', 'listings', 'clients', 'viewings', 'revenue',
    'teamwork', 'billing', 'analytics', 'notifications', 'system'
  ))
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_category ON analytics_events(event_type, event_category);

-- Detailed Metrics Table - Pre-calculated metrics for performance
CREATE TABLE IF NOT EXISTS detailed_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metric_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT metric_type_check CHECK (metric_type IN (
    'posts_created', 'posts_viewed', 'posts_shared',
    'listings_count', 'listings_active', 'listings_archived',
    'clients_count', 'clients_active', 'clients_contacted',
    'viewings_scheduled', 'viewings_completed', 'viewings_cancelled',
    'revenue_total', 'revenue_commission', 'revenue_rental',
    'teamwork_shares', 'teamwork_collaborators',
    'credits_balance', 'credits_used', 'credits_purchased'
  )),
  UNIQUE(user_id, metric_date, metric_type)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_detailed_metrics_user_id ON detailed_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_detailed_metrics_date ON detailed_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_detailed_metrics_user_date ON detailed_metrics(user_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_detailed_metrics_type ON detailed_metrics(metric_type);

-- Export Logs Table - Track all exports for audit and analytics
CREATE TABLE IF NOT EXISTS export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  export_format TEXT NOT NULL,
  export_date_range DATERANGE NOT NULL,
  export_filters JSONB NOT NULL DEFAULT '{}',
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  row_count INTEGER,
  export_duration_ms INTEGER,
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT export_type_check CHECK (export_type IN (
    'posts', 'listings', 'clients', 'viewings', 'revenue',
    'teamwork', 'activity', 'full_analytics'
  )),
  CONSTRAINT export_format_check CHECK (export_format IN (
    'csv', 'pdf', 'excel', 'json'
  ))
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_exported_at ON export_logs(exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_logs_user_exported_at ON export_logs(user_id, exported_at DESC);

-- Monthly Summary Table - Cache monthly aggregates
CREATE TABLE IF NOT EXISTS monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  posts_created INTEGER DEFAULT 0,
  posts_viewed INTEGER DEFAULT 0,
  listings_created INTEGER DEFAULT 0,
  clients_added INTEGER DEFAULT 0,
  viewings_scheduled INTEGER DEFAULT 0,
  viewings_completed INTEGER DEFAULT 0,
  revenue_total DECIMAL(10, 2) DEFAULT 0,
  revenue_commission DECIMAL(10, 2) DEFAULT 0,
  teamwork_shares INTEGER DEFAULT 0,
  active_clients INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, month)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_monthly_summary_user_id ON monthly_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_summary_month ON monthly_summary(month DESC);

-- RLS Policies for analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see only their own events" 
  ON analytics_events FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events" 
  ON analytics_events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for detailed_metrics
ALTER TABLE detailed_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see only their own metrics" 
  ON detailed_metrics FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own metrics" 
  ON detailed_metrics FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics" 
  ON detailed_metrics FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for export_logs
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see only their own export logs" 
  ON export_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export logs" 
  ON export_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for monthly_summary
ALTER TABLE monthly_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see only their own monthly summary" 
  ON monthly_summary FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly summary" 
  ON monthly_summary FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly summary" 
  ON monthly_summary FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to record analytics event
CREATE OR REPLACE FUNCTION record_analytics_event(
  p_event_type TEXT,
  p_event_category TEXT,
  p_event_data JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO analytics_events (user_id, event_type, event_category, event_data)
  VALUES (auth.uid(), p_event_type, p_event_category, p_event_data)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
) RETURNS TABLE(
  total_events BIGINT,
  unique_event_types INT,
  event_category_distribution JSONB,
  daily_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH category_stats AS (
    SELECT 
      event_category,
      COUNT(*) as category_count
    FROM analytics_events
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '1 day' * p_days_back
    GROUP BY event_category
  ),
  daily_stats AS (
    SELECT 
      DATE(created_at)::TEXT as event_date,
      COUNT(*) as daily_count
    FROM analytics_events
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '1 day' * p_days_back
    GROUP BY DATE(created_at)
  )
  SELECT 
    (SELECT COUNT(*)::BIGINT FROM analytics_events 
     WHERE user_id = p_user_id 
       AND created_at >= NOW() - INTERVAL '1 day' * p_days_back) as total_events,
    (SELECT COUNT(DISTINCT event_type)::INT FROM analytics_events 
     WHERE user_id = p_user_id 
       AND created_at >= NOW() - INTERVAL '1 day' * p_days_back) as unique_event_types,
    COALESCE(jsonb_object_agg(event_category, category_count), '{}'::jsonb) as event_category_distribution,
    COALESCE((SELECT jsonb_object_agg(event_date, daily_count) FROM daily_stats), '{}'::jsonb) as daily_breakdown
  FROM category_stats;
END;
$$ LANGUAGE plpgsql;
