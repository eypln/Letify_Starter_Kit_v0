-- Advanced Analytics Tables and RLS Policies - PART 1: Tables Only
-- Migration: 2025_12_advanced_analytics_part1

-- Drop existing analytics tables if they exist (clean slate)
-- NOTE: We keep the existing 'activity' table intact
DROP TABLE IF EXISTS user_analytics_events CASCADE;
DROP TABLE IF EXISTS user_detailed_metrics CASCADE;
DROP TABLE IF EXISTS user_export_logs CASCADE;
DROP TABLE IF EXISTS user_monthly_summary CASCADE;

-- User Analytics Events Table - Track user interactions and feature usage
CREATE TABLE user_analytics_events (
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
CREATE INDEX idx_user_analytics_events_user_id ON user_analytics_events(user_id);
CREATE INDEX idx_user_analytics_events_created_at ON user_analytics_events(created_at DESC);
CREATE INDEX idx_user_analytics_events_user_created ON user_analytics_events(user_id, created_at DESC);
CREATE INDEX idx_user_analytics_events_type_category ON user_analytics_events(event_type, event_category);

-- User Detailed Metrics Table - Pre-calculated metrics for performance
CREATE TABLE user_detailed_metrics (
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
CREATE INDEX idx_user_detailed_metrics_user_id ON user_detailed_metrics(user_id);
CREATE INDEX idx_user_detailed_metrics_date ON user_detailed_metrics(metric_date DESC);
CREATE INDEX idx_user_detailed_metrics_user_date ON user_detailed_metrics(user_id, metric_date DESC);
CREATE INDEX idx_user_detailed_metrics_type ON user_detailed_metrics(metric_type);

-- User Export Logs Table - Track all exports for audit and analytics
CREATE TABLE user_export_logs (
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
CREATE INDEX idx_user_export_logs_user_id ON user_export_logs(user_id);
CREATE INDEX idx_user_export_logs_exported_at ON user_export_logs(exported_at DESC);
CREATE INDEX idx_user_export_logs_user_exported_at ON user_export_logs(user_id, exported_at DESC);

-- User Monthly Summary Table - Cache monthly aggregates
CREATE TABLE user_monthly_summary (
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
CREATE INDEX idx_user_monthly_summary_user_id ON user_monthly_summary(user_id);
CREATE INDEX idx_user_monthly_summary_month ON user_monthly_summary(month DESC);

-- RLS Policies for user_analytics_events
ALTER TABLE user_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see only their own events" 
  ON user_analytics_events FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events" 
  ON user_analytics_events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_detailed_metrics
ALTER TABLE user_detailed_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see only their own metrics" 
  ON user_detailed_metrics FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own metrics" 
  ON user_detailed_metrics FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics" 
  ON user_detailed_metrics FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_export_logs
ALTER TABLE user_export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see only their own export logs" 
  ON user_export_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export logs" 
  ON user_export_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_monthly_summary
ALTER TABLE user_monthly_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see only their own monthly summary" 
  ON user_monthly_summary FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly summary" 
  ON user_monthly_summary FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly summary" 
  ON user_monthly_summary FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
