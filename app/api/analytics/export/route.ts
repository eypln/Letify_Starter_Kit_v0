import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const user = await getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await req.json()
    const { exportType, exportFormat, startDate, endDate, filters = {} } = body

    if (!exportType || !exportFormat || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: exportType, exportFormat, startDate, endDate' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // Fetch data based on export type
    let data: Record<string, unknown>[] = []

    try {
      switch (exportType) {
        case 'posts':
          // Posts are actually listings in our database
          const { data: posts, error: postsError } = await supabase
            .from('listings')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', startDate)
            .lte('created_at', endDate)

          if (postsError) throw postsError
          data = posts || []
          break

        case 'clients':
          const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', startDate)
            .lte('created_at', endDate)

          if (clientsError) throw clientsError
          data = clients || []
          break

        case 'listings':
          const { data: listings, error: listingsError } = await supabase
            .from('listings')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', startDate)
            .lte('created_at', endDate)

          if (listingsError) throw listingsError
          data = listings || []
          break

        case 'viewings':
          const { data: viewings, error: viewingsError } = await supabase
            .from('viewings')
            .select('*')
            .eq('user_id', user.id)
            .gte('viewing_date', startDate)
            .lte('viewing_date', endDate)

          if (viewingsError) throw viewingsError
          data = viewings || []
          break

        case 'revenue':
          const { data: revenue, error: revenueError } = await supabase
            .from('revenue')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', startDate)
            .lte('created_at', endDate)

          if (revenueError) throw revenueError
          data = revenue || []
          break

        default:
          return NextResponse.json(
            { error: `Invalid export type: ${exportType}. Valid types: posts, clients, listings, viewings, revenue` },
            { status: 400 }
          )
      }
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error'
      console.error(`Database error fetching ${exportType}:`, dbError)
      return NextResponse.json(
        { error: `Failed to fetch ${exportType} data: ${errorMessage}` },
        { status: 500 }
      )
    }

    // Format data based on export format
    let exportData: string | Buffer
    let contentType: string
    let fileName: string

    const timestamp = new Date().toISOString().split('T')[0]

    switch (exportFormat) {
      case 'csv':
        exportData = convertToCSV(data)
        contentType = 'text/csv; charset=utf-8'
        fileName = `${exportType}_${timestamp}.csv`
        break

      case 'json':
        exportData = JSON.stringify(data, null, 2)
        contentType = 'application/json'
        fileName = `${exportType}_${timestamp}.json`
        break

      case 'excel':
        exportData = convertToExcel(data)
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        fileName = `${exportType}_${timestamp}.xlsx`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid export format' },
          { status: 400 }
        )
    }

    // Record export log
    const exportDuration = Date.now() - startTime
    const exportDataSize = typeof exportData === 'string' 
      ? Buffer.byteLength(exportData) 
      : exportData.length

    await supabase.from('user_export_logs').insert({
      user_id: user.id,
      export_type: exportType,
      export_format: exportFormat,
      export_date_range: `[${startDate}, ${endDate}]`,
      export_filters: filters,
      file_name: fileName,
      file_size_bytes: exportDataSize,
      row_count: data.length,
      export_duration_ms: exportDuration,
    })

    return new NextResponse(exportData as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as { code?: string }).code
    console.error('Export error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate export',
        details: errorMessage,
        type: errorCode || 'UNKNOWN'
      },
      { status: 500 }
    )
  }
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''

  // Get headers
  const headers = Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
          return `"${String(value).replace(/"/g, '""')}"`
        })
        .join(',')
    ),
  ].join('\n')

  return csvContent
}

function convertToExcel(data: Record<string, unknown>[]): Buffer {
  if (data.length === 0) {
    // Create empty workbook
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([['No data available']])
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return Buffer.from(buffer)
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new()

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Auto-size columns (optional but nice)
  const maxWidth = 50
  const colWidths: { wch: number }[] = []
  const headers = Object.keys(data[0] || {})
  
  headers.forEach((header, i) => {
    let maxLen = header.length
    data.forEach(row => {
      const val = String(row[header] || '')
      if (val.length > maxLen) maxLen = val.length
    })
    colWidths[i] = { wch: Math.min(maxLen + 2, maxWidth) }
  })
  
  worksheet['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export')

  // Generate Excel file as buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return Buffer.from(buffer)
}
