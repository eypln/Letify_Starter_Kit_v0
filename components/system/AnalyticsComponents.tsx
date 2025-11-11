'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp, TrendingDown } from 'lucide-react'
import { getAnalyticsSummary, downloadFile, exportData } from '@/lib/analytics'

interface MetricsChartProps {
  title: string
  value: number
  change?: number
  unit?: string
  category?: string
}

export function MetricsChart({ title, value, change, unit = '', category }: MetricsChartProps) {
  const isPositive = !change || change >= 0
  const changePercent = change ? Math.abs(change).toFixed(1) : '0'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {value.toLocaleString()}
            {unit}
          </span>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{changePercent}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ExportButtonProps {
  exportType: string
  startDate?: string
  endDate?: string
}

export function ExportButton({ exportType, startDate, endDate }: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: 'csv' | 'json' | 'excel') => {
    setIsLoading(true)
    setError(null)
    try {
      const defaultStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const defaultEndDate = endDate || new Date().toISOString().split('T')[0]

      const blob = await exportData(
        exportType as any,
        format,
        defaultStartDate,
        defaultEndDate
      )

      if (blob) {
        // Map format to correct file extension
        const fileExtension = format === 'excel' ? 'xlsx' : format
        const fileName = `${exportType}_${new Date().toISOString().split('T')[0]}.${fileExtension}`
        downloadFile(blob, fileName)
      } else {
        setError('Export failed: No data returned')
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Export failed'
      console.error('Export failed:', error)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport('csv')}
          disabled={isLoading}
        >
          <Download className="w-4 h-4 mr-2" />
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport('excel')}
          disabled={isLoading}
        >
          <Download className="w-4 h-4 mr-2" />
          Excel
        </Button>
      </div>
    </div>
  )
}

interface AnalyticsDashboardProps {
  daysBack?: number
}

export function AnalyticsDashboard({ daysBack = 30 }: AnalyticsDashboardProps) {
  const [summary, setSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await getAnalyticsSummary(daysBack)
        setSummary(data)
      } catch (error) {
        console.error('Failed to load summary:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSummary()
  }, [daysBack])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!summary) {
    return <div>No data available</div>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsChart title="Total Events" value={summary.summary.totalEvents} />
        <MetricsChart title="Event Types" value={summary.summary.uniqueEventTypes} />
        <MetricsChart title="Categories" value={summary.summary.uniqueCategories} />
        <MetricsChart title="Days Tracked" value={summary.summary.daysBack} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Distribution</CardTitle>
          <CardDescription>Events by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(summary.categoryDistribution).map(([category, count]: [string, any]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{category}</span>
                <span className="text-sm text-muted-foreground">{count} events</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface DetailedReportsViewProps {
  reportType: string
}

export function DetailedReportsView({ reportType }: DetailedReportsViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{reportType} Report</CardTitle>
        <CardDescription>Detailed metrics and insights</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Detailed report data will appear here
          </p>
          <ExportButton exportType={reportType} />
        </div>
      </CardContent>
    </Card>
  )
}
