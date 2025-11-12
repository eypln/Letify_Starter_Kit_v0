import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendViewingReminder } from '@/lib/pushNotificationHelper'

export const dynamic = 'force-dynamic'

/**
 * Check for scheduled viewings and send reminders
 * Should be called via cron job every hour
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const now = new Date()

    // Calculate time windows for reminders
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    
    // Format dates for comparison (YYYY-MM-DD HH:MM)
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}`
    }

    const currentHour = formatDateTime(now)
    const oneDayAheadHour = formatDateTime(oneDayFromNow)
    const twoHoursAheadHour = formatDateTime(twoHoursFromNow)

    console.log('Checking viewing reminders...', {
      currentHour,
      oneDayAheadHour,
      twoHoursAheadHour
    })

    // Get all scheduled viewings
    const { data: viewings, error } = await supabase
      .from('viewings')
      .select('*')
      .eq('result', 'Scheduled')
      .not('viewing_date', 'is', null)
      .not('viewing_time', 'is', null)

    if (error) {
      console.error('Error fetching viewings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!viewings || viewings.length === 0) {
      return NextResponse.json({ 
        message: 'No scheduled viewings found',
        sent: 0 
      })
    }

    let sentCount = 0
    const notifications = []

    for (const viewing of viewings) {
      // Skip if viewing_time is null
      if (!viewing.viewing_time) {
        continue
      }

      const viewingDateTime = `${viewing.viewing_date} ${viewing.viewing_time.substring(0, 5)}`
      const viewingDate = new Date(`${viewing.viewing_date}T${viewing.viewing_time}`)
      
      // Check if we need to send 24-hour reminder
      const viewingDateStr = viewing.viewing_date
      const oneDayBeforeStr = oneDayFromNow.toISOString().split('T')[0]
      
      // Check if we need to send 2-hour reminder
      const timeDiff = viewingDate.getTime() - now.getTime()
      const hoursUntilViewing = timeDiff / (1000 * 60 * 60)
      
      // Send 24-hour reminder (check if it's roughly 24 hours before)
      if (viewingDateStr === oneDayBeforeStr && hoursUntilViewing >= 23 && hoursUntilViewing <= 25) {
        const sent = await sendViewingReminder(viewing.user_id, {
          title: '📅 Viewing Tomorrow',
          body: `Reminder: Viewing tomorrow at ${viewing.viewing_time.substring(0, 5)} - ${viewing.ref_no || 'Property'} in ${viewing.city || 'Location'}`,
          icon: '/icons/Logo/192.png',
          tag: `viewing-reminder-24h-${viewing.id}`,
          data: {
            type: 'viewing_reminder',
            viewingId: viewing.id,
            refNo: viewing.ref_no,
            city: viewing.city,
            timeWindow: '24h'
          }
        })

        if (sent) {
          sentCount++
          notifications.push({
            viewingId: viewing.id,
            type: '24h',
            refNo: viewing.ref_no,
            city: viewing.city
          })
        }
      }
      
      // Send 2-hour reminder
      if (hoursUntilViewing >= 1.9 && hoursUntilViewing <= 2.1) {
        const sent = await sendViewingReminder(viewing.user_id, {
          title: '⏰ Viewing in 2 Hours',
          body: `Viewing at ${viewing.viewing_time.substring(0, 5)} - ${viewing.ref_no || 'Property'} in ${viewing.city || 'Location'}`,
          icon: '/icons/Logo/192.png',
          tag: `viewing-reminder-2h-${viewing.id}`,
          data: {
            type: 'viewing_reminder',
            viewingId: viewing.id,
            refNo: viewing.ref_no,
            city: viewing.city,
            clientName: viewing.client_name,
            timeWindow: '2h'
          }
        })

        if (sent) {
          sentCount++
          notifications.push({
            viewingId: viewing.id,
            type: '2h',
            refNo: viewing.ref_no,
            city: viewing.city
          })
        }
      }

      // Send result update reminder (2 hours AFTER viewing)
      const hoursAfterViewing = -hoursUntilViewing // Negative means in the past
      if (hoursAfterViewing >= 1.9 && hoursAfterViewing <= 2.1) {
        const sent = await sendViewingReminder(viewing.user_id, {
          title: '📝 Update Viewing Result',
          body: `Please update the result for viewing: ${viewing.ref_no || 'Property'} in ${viewing.city || 'Location'} at ${viewing.viewing_time.substring(0, 5)}`,
          icon: '/icons/Logo/192.png',
          tag: `viewing-update-${viewing.id}`,
          data: {
            type: 'viewing_update_reminder',
            viewingId: viewing.id,
            refNo: viewing.ref_no,
            city: viewing.city,
            timeWindow: 'after_2h'
          }
        })

        if (sent) {
          sentCount++
          notifications.push({
            viewingId: viewing.id,
            type: 'update_result',
            refNo: viewing.ref_no,
            city: viewing.city
          })
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Viewing reminders checked`,
      totalViewings: viewings.length,
      sent: sentCount,
      notifications
    })

  } catch (error: any) {
    console.error('Error checking viewing reminders:', error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}
