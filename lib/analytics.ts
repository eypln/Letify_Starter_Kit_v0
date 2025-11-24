/**
 * Analytics Library
 * Handles event tracking, metrics calculation, and data export
 */

import { AnalyticsEvent, DetailedMetrics } from '@/types/database.types'

/**
 * Record an analytics event
 */
export async function trackEvent(
  eventType: string,
  eventCategory: string,
  eventData: Record<string, unknown> = {}
): Promise<AnalyticsEvent | null> {
  try {
    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, eventCategory, eventData }),
    })

    if (!response.ok) {
      console.error('Failed to track event:', await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Event tracking error:', error)
    return null
  }
}

/**
 * Get analytics summary
 */
export async function getAnalyticsSummary(daysBack: number = 30, category?: string) {
  try {
    const params = new URLSearchParams({
      days: daysBack.toString(),
      ...(category && { category }),
    })

    const response = await fetch(`/api/analytics/summary?${params}`)

    if (!response.ok) {
      throw new Error('Failed to fetch analytics summary')
    }

    return await response.json()
  } catch (error) {
    console.error('Analytics summary error:', error)
    return null
  }
}

/**
 * Get detailed metrics
 */
export async function getDetailedMetrics(
  startDate?: string,
  endDate?: string,
  metricType?: string,
  limit: number = 100
) {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(startDate && { start: startDate }),
      ...(endDate && { end: endDate }),
      ...(metricType && { type: metricType }),
    })

    const response = await fetch(`/api/analytics/detailed?${params}`)

    if (!response.ok) {
      throw new Error('Failed to fetch detailed metrics')
    }

    return await response.json()
  } catch (error) {
    console.error('Detailed metrics error:', error)
    return null
  }
}

/**
 * Export data
 */
export async function exportData(
  exportType: 'posts' | 'clients' | 'listings' | 'viewings' | 'revenue',
  exportFormat: 'csv' | 'json' | 'excel',
  startDate: string,
  endDate: string,
  filters: Record<string, unknown> = {}
): Promise<Blob | null> {
  try {
    const response = await fetch('/api/analytics/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exportType,
        exportFormat,
        startDate,
        endDate,
        filters,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to export data: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return await response.blob()
  } catch (error) {
    console.error('Export error:', error)
    return null
  }
}

/**
 * Download exported file
 */
export function downloadFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Calculate growth percentage
 */
export function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Format metrics data for charts
 */
export function formatMetricsForChart(metrics: DetailedMetrics[]) {
  interface ChartDataPoint {
    date: string;
    value: number;
    [key: string]: unknown;
  }
  const chartData: Record<string, ChartDataPoint[]> = {}

  metrics.forEach(metric => {
    if (!chartData[metric.metric_type]) {
      chartData[metric.metric_type] = []
    }

    chartData[metric.metric_type].push({
      date: metric.metric_date,
      value: metric.metric_value,
      ...metric.metric_data,
    })
  })

  return chartData
}

/**
 * Calculate summary statistics from events
 */
export function calculateEventSummary(events: AnalyticsEvent[]) {
  const categoryCount: Record<string, number> = {}
  const typeCount: Record<string, number> = {}
  const hourlyDistribution: Record<number, number> = {}

  events.forEach(event => {
    // Category count
    categoryCount[event.event_category] = (categoryCount[event.event_category] || 0) + 1

    // Type count
    typeCount[event.event_type] = (typeCount[event.event_type] || 0) + 1

    // Hourly distribution
    const hour = new Date(event.created_at).getHours()
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
  })

  return {
    totalEvents: events.length,
    uniqueCategories: Object.keys(categoryCount).length,
    uniqueTypes: Object.keys(typeCount).length,
    categoryCount,
    typeCount,
    hourlyDistribution,
  }
}

/**
 * Get analytics for a specific date range
 */
export async function getAnalyticsForDateRange(
  startDate: string,
  endDate: string
): Promise<{
  summary: unknown;
  metrics: unknown;
  dateRange: { startDate: string; endDate: string };
} | null> {
  try {
    const summary = await getAnalyticsSummary(
      Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000))
    )

    const metrics = await getDetailedMetrics(startDate, endDate)

    return {
      summary,
      metrics,
      dateRange: { startDate, endDate },
    }
  } catch (error) {
    console.error('Failed to get analytics for date range:', error)
    return null
  }
}

/**
 * Prepare CSV content for download
 */
export function prepareCSVContent(data: Record<string, unknown>[], fileName: string): { content: string; fileName: string } {
  if (!data || data.length === 0) {
    return { content: '', fileName: `${fileName}_empty.csv` }
  }

  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers
      .map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        return `"${String(value).replace(/"/g, '""')}"`
      })
      .join(',')
  )

  const content = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n')

  return {
    content,
    fileName: `${fileName}_${new Date().toISOString().split('T')[0]}.csv`,
  }
}

/**
 * Parse analytics filters
 */
export function parseAnalyticsFilters(filterString?: string): Record<string, unknown> {
  if (!filterString) return {}

  try {
    return JSON.parse(filterString)
  } catch {
    return {}
  }
}

/**
 * Get top events by frequency
 */
export function getTopEventsByFrequency(events: AnalyticsEvent[], limit: number = 5) {
  const eventCounts: Record<string, number> = {}

  events.forEach(event => {
    const key = `${event.event_type}_${event.event_category}`
    eventCounts[key] = (eventCounts[key] || 0) + 1
  })

  return Object.entries(eventCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, count]) => {
      const [eventType, eventCategory] = key.split('_')
      return { eventType, eventCategory, count }
    })
}
