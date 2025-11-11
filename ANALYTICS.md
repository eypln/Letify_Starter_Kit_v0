# Advanced Analytics & Export Features

## Overview

The Advanced Analytics system provides comprehensive tracking, detailed metrics, and flexible data export capabilities for Letify users. This system enables users to analyze their performance, track user activities, and export data in multiple formats.

## Features

### 1. Event Tracking
- Track all user activities and interactions
- Event categories: Posts, Listings, Clients, Viewings, Revenue, Teamwork, Billing, Analytics, Notifications, System
- Event types: Creation, viewing, updates, deletions, sharing, purchasing, etc.
- Custom event data storage with JSONB support

### 2. Detailed Metrics
- Pre-calculated daily metrics for performance
- Track various metrics types: posts created/viewed, listings count, clients added, viewings, revenue, etc.
- Trend analysis and historical data
- Support for custom metric data

### 3. Data Export
- **CSV Export**: Spreadsheet-compatible format, import into Excel, Google Sheets, etc.
- **JSON Export**: Raw data format for API integrations
- **Excel Export**: Formatted Excel files with proper styling
- Export types: Posts, Clients, Listings, Viewings, Revenue
- Date range filtering
- Custom filters support
- Export history logging

### 4. Analytics Dashboard
- Real-time analytics overview
- Event distribution by category
- Daily breakdown of activities
- Quick statistics (total events, unique types, unique categories)
- Recent activity feed
- Customizable date ranges with presets

## Database Schema

### Tables

#### `analytics_events`
Stores individual user events and interactions.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- event_type: TEXT (30+ event types)
- event_category: TEXT (10 categories)
- event_data: JSONB (Custom event metadata)
- created_at: TIMESTAMP
```

**Indexes:**
- `idx_analytics_events_user_id` - Fast user lookups
- `idx_analytics_events_created_at` - Time-based queries
- `idx_analytics_events_user_created` - Combined user + time queries
- `idx_analytics_events_type_category` - Event classification queries

#### `detailed_metrics`
Pre-aggregated daily metrics for performance.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- metric_date: DATE
- metric_type: TEXT (20+ metric types)
- metric_value: NUMERIC
- metric_data: JSONB (Additional metric details)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- UNIQUE(user_id, metric_date, metric_type)
```

#### `export_logs`
Audit trail for all data exports.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- export_type: TEXT (posts, clients, listings, viewings, revenue, teamwork, activity, full_analytics)
- export_format: TEXT (csv, pdf, excel, json)
- export_date_range: DATERANGE
- export_filters: JSONB
- file_name: TEXT
- file_size_bytes: INTEGER
- row_count: INTEGER
- export_duration_ms: INTEGER
- exported_at: TIMESTAMP
```

#### `monthly_summary`
Cached monthly aggregates for quick dashboard loading.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- month: DATE
- posts_created: INTEGER
- posts_viewed: INTEGER
- listings_created: INTEGER
- clients_added: INTEGER
- viewings_scheduled: INTEGER
- viewings_completed: INTEGER
- revenue_total: DECIMAL
- revenue_commission: DECIMAL
- teamwork_shares: INTEGER
- active_clients: INTEGER
- active_listings: INTEGER
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Database Functions

#### `record_analytics_event(p_event_type, p_event_category, p_event_data)`
Records a new analytics event for the current user.

```sql
SELECT record_analytics_event(
  'post_created',
  'posts',
  '{"post_id": 123, "platform": "facebook"}'::jsonb
);
```

#### `get_analytics_summary(p_user_id, p_days_back)`
Returns analytics summary for a user over a specified period.

```sql
SELECT * FROM get_analytics_summary(
  'user-uuid',
  30  -- last 30 days
);
```

## API Endpoints

### Track Event
**POST** `/api/analytics/track`

Record a new analytics event.

**Request Body:**
```json
{
  "eventType": "post_created",
  "eventCategory": "posts",
  "eventData": {
    "post_id": 123,
    "platform": "facebook",
    "reach": 500
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "event_type": "post_created",
  "event_category": "posts",
  "event_data": {...},
  "created_at": "2025-11-10T10:30:00Z"
}
```

### Get Summary
**GET** `/api/analytics/summary`

Get analytics summary with optional filtering.

**Query Parameters:**
- `days` (integer): Number of days back (default: 30)
- `category` (string, optional): Filter by event category

**Response:**
```json
{
  "summary": {
    "totalEvents": 1523,
    "uniqueEventTypes": 12,
    "uniqueCategories": 5,
    "daysBack": 30
  },
  "categoryDistribution": {
    "posts": 450,
    "clients": 230,
    "listings": 180,
    ...
  },
  "typeDistribution": {
    "post_created": 200,
    "client_added": 150,
    ...
  },
  "dailyBreakdown": {
    "2025-11-10": 45,
    "2025-11-09": 38,
    ...
  },
  "recentEvents": [...]
}
```

### Get Detailed Metrics
**GET** `/api/analytics/detailed`

Fetch detailed metrics with trend analysis.

**Query Parameters:**
- `start` (string): Start date (YYYY-MM-DD, optional)
- `end` (string): End date (YYYY-MM-DD, optional)
- `type` (string): Metric type filter (optional)
- `limit` (integer): Maximum results (default: 100)

**Response:**
```json
{
  "metrics": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "metric_date": "2025-11-10",
      "metric_type": "posts_created",
      "metric_value": 5,
      "metric_data": {...},
      "created_at": "2025-11-10T10:30:00Z",
      "updated_at": "2025-11-10T10:30:00Z"
    }
  ],
  "trends": {
    "posts_created": {
      "current": 5,
      "previous": 3,
      "change": 66.67
    }
  },
  "count": 10
}
```

### Export Data
**POST** `/api/analytics/export`

Export data in multiple formats.

**Request Body:**
```json
{
  "exportType": "posts",
  "exportFormat": "csv",
  "startDate": "2025-10-10",
  "endDate": "2025-11-10",
  "filters": {
    "status": "published",
    "platform": "facebook"
  }
}
```

**Response:** File download (Blob)

**Supported Export Types:**
- `posts` - User posts/content
- `clients` - Client data
- `listings` - Listings/properties
- `viewings` - Property viewings
- `revenue` - Revenue records

**Supported Formats:**
- `csv` - Comma-separated values
- `json` - JSON format
- `excel` - Excel spreadsheet

## Client Library (`lib/analytics.ts`)

### Functions

#### `trackEvent(eventType, eventCategory, eventData?)`
Track a new user event.

```typescript
import { trackEvent } from '@/lib/analytics'

await trackEvent(
  'post_created',
  'posts',
  { post_id: 123, platform: 'facebook' }
)
```

#### `getAnalyticsSummary(daysBack?, category?)`
Get analytics summary.

```typescript
import { getAnalyticsSummary } from '@/lib/analytics'

const summary = await getAnalyticsSummary(30, 'posts')
```

#### `getDetailedMetrics(startDate?, endDate?, metricType?, limit?)`
Get detailed metrics with optional filtering.

```typescript
import { getDetailedMetrics } from '@/lib/analytics'

const metrics = await getDetailedMetrics(
  '2025-10-10',
  '2025-11-10',
  'posts_created',
  50
)
```

#### `exportData(exportType, exportFormat, startDate, endDate, filters?)`
Export data in specified format.

```typescript
import { exportData, downloadFile } from '@/lib/analytics'

const blob = await exportData(
  'posts',
  'csv',
  '2025-10-10',
  '2025-11-10',
  { status: 'published' }
)

if (blob) {
  downloadFile(blob, 'posts_2025-11-10.csv')
}
```

#### `calculateGrowthPercentage(current, previous)`
Calculate percentage growth.

```typescript
const growth = calculateGrowthPercentage(100, 75) // 33.33%
```

#### `calculateEventSummary(events)`
Calculate summary statistics from events.

```typescript
const summary = calculateEventSummary(events)
// Returns: categoryCount, typeCount, hourlyDistribution
```

## UI Components (`components/system/AnalyticsComponents.tsx`)

### MetricsChart
Display a single metric with optional trend indicator.

```tsx
<MetricsChart 
  title="Total Posts" 
  value={42} 
  change={15}
  unit=""
/>
```

### ExportButton
Multi-format export button component.

```tsx
<ExportButton 
  exportType="posts" 
  startDate="2025-10-10"
  endDate="2025-11-10"
/>
```

### AnalyticsDashboard
Complete analytics overview dashboard.

```tsx
<AnalyticsDashboard daysBack={30} />
```

### DetailedReportsView
Detailed report display component.

```tsx
<DetailedReportsView reportType="posts" />
```

## Analytics Dashboard Page

**Route:** `/dashboard/analytics`

Features:
- Date range selector with quick filters
- Event distribution visualization
- Category breakdowns
- Data export interface
- Monthly activity tracking
- Daily viewings chart
- Budget/price distribution analysis

## Implementation Guide

### Recording Events

Track events throughout the application:

```typescript
// When user creates a post
import { trackEvent } from '@/lib/analytics'

await trackEvent('post_created', 'posts', {
  post_id: newPostId,
  platform: 'facebook',
  content_length: content.length
})

// When user adds a client
await trackEvent('client_added', 'clients', {
  client_id: newClientId,
  source: 'manual'
})

// When user schedules a viewing
await trackEvent('viewing_scheduled', 'viewings', {
  viewing_id: viewingId,
  property_id: propertyId
})
```

### Integrating Export Feature

```typescript
import { exportData, downloadFile } from '@/lib/analytics'

const handleExport = async (type, format, startDate, endDate) => {
  const blob = await exportData(type, format, startDate, endDate)
  if (blob) {
    downloadFile(blob, `${type}_${new Date().toISOString().split('T')[0]}.${format}`)
  }
}
```

### Custom Metrics

Calculate and store custom metrics:

```typescript
// This would typically run via a cron job or batch process
const calculateDailyMetrics = async (userId, date) => {
  const posts = await countPostsCreated(userId, date)
  const clients = await countClientsAdded(userId, date)
  
  await insertDetailedMetrics(userId, date, 'posts_created', posts)
  await insertDetailedMetrics(userId, date, 'clients_added', clients)
}
```

## Performance Considerations

### Query Optimization
- Indexes on frequently queried columns (user_id, created_at)
- Composite indexes for common query patterns
- Materialized view for monthly summaries

### Data Retention
- Keep raw events for 90 days
- Archive older data to separate tables
- Use monthly summaries for historical analysis

### Export Performance
- Stream large exports to prevent memory issues
- Implement pagination for large datasets
- Cache frequently exported data

## Security

### Row Level Security (RLS)
- Users can only access their own analytics events
- Users can only view their own metrics
- Users can only see their own export logs

### Data Privacy
- No sensitive user data in events
- Minimal event metadata storage
- GDPR-compliant data retention

## Testing

Run analytics tests:

```bash
npm test -- analytics
```

Test coverage includes:
- Event tracking API
- Metrics calculation
- Export generation
- CSV/JSON formatting
- Data privacy/security

## Best Practices

1. **Event Naming**: Use descriptive, consistent event names
   - Format: `[action]_[entity]` (e.g., `post_created`, `client_added`)

2. **Event Data**: Store only necessary metadata
   - Include IDs for reference
   - Add relevant context (platform, source, etc.)

3. **Metric Calculation**: Aggregate regularly
   - Run daily metric calculations at consistent time
   - Update monthly summaries monthly

4. **Export Limits**: Consider rate limiting
   - Limit exports per user per day
   - Track export usage in export_logs

5. **Data Archival**: Implement retention policies
   - Archive events older than 90 days
   - Keep metrics indefinitely
   - Use export_logs for audit trail

## Troubleshooting

### Missing Events
- Check RLS policies are correctly configured
- Verify trackEvent is being called
- Check network requests in browser dev tools

### Export Failures
- Verify date range is valid
- Check export_type and export_format values
- Check file system permissions for downloads

### Performance Issues
- Check database query performance
- Ensure indexes are created
- Monitor monthly_summary table size

### Missing Metrics
- Verify metric calculation job is running
- Check for calculation errors in logs
- Manually trigger metric calculation if needed

## Future Enhancements

1. **Real-time Analytics**: WebSocket updates for live metrics
2. **Custom Dashboards**: User-configurable dashboard widgets
3. **Advanced Filters**: Complex query builder for exports
4. **Scheduled Reports**: Automatic report generation and email
5. **Predictive Analytics**: ML-based trend forecasting
6. **API Rate Limiting**: Configurable rate limits per user tier
7. **Data Visualization**: Enhanced charts and graphs
8. **Bulk Operations**: Batch event recording
9. **Custom Events**: User-defined event types
10. **Event Replay**: Debug mode to replay events

## Support

For issues or questions about Analytics:
- Check this documentation
- Review test files for usage examples
- Contact support team

## Version History

### v1.0.0 (Nov 10, 2025)
- Initial release
- Event tracking system
- Detailed metrics collection
- Multi-format data export
- Analytics dashboard
- Full RLS implementation
