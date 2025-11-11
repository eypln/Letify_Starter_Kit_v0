-- Advanced Analytics Functions - PART 2: Functions Only
-- Migration: 2025_12_advanced_analytics_part2
-- RUN THIS AFTER PART 1 (tables)

-- Function to record analytics event
CREATE OR REPLACE FUNCTION record_analytics_event(
  p_event_type TEXT,
  p_event_category TEXT,
  p_event_data JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO user_analytics_events (user_id, event_type, event_category, event_data)
  VALUES (auth.uid(), p_event_type, p_event_category, p_event_data)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified function to get user analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
) RETURNS TABLE(
  total_events BIGINT,
  unique_event_types INT,
  event_category_distribution JSONB,
  daily_breakdown JSONB
) AS $$
DECLARE
  v_total_events BIGINT;
  v_unique_types INT;
  v_category_dist JSONB;
  v_daily_breakdown JSONB;
BEGIN
  -- Get total events count
  SELECT COUNT(*) INTO v_total_events
  FROM user_analytics_events
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days_back;

  -- Get unique event types count
  SELECT COUNT(DISTINCT event_type) INTO v_unique_types
  FROM user_analytics_events
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days_back;

  -- Get category distribution
  SELECT COALESCE(jsonb_object_agg(event_category, category_count), '{}'::jsonb)
  INTO v_category_dist
  FROM (
    SELECT 
      event_category,
      COUNT(*) as category_count
    FROM user_analytics_events
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '1 day' * p_days_back
    GROUP BY event_category
  ) cat;

  -- Get daily breakdown
  SELECT COALESCE(jsonb_object_agg(event_date, daily_count), '{}'::jsonb)
  INTO v_daily_breakdown
  FROM (
    SELECT 
      DATE(created_at)::TEXT as event_date,
      COUNT(*) as daily_count
    FROM user_analytics_events
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '1 day' * p_days_back
    GROUP BY DATE(created_at)
  ) daily;

  -- Return single row with all aggregates
  RETURN QUERY
  SELECT 
    v_total_events,
    v_unique_types,
    v_category_dist,
    v_daily_breakdown;
END;
$$ LANGUAGE plpgsql;
