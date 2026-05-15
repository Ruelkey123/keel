import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendBookingConfirmation,
  sendBookingReminder,
  sendBookingCancellation,
} from '@/lib/email'
import type { NotificationType } from '@/types/database'

export async function POST(req: NextRequest) {
  try {
    // Verify internal secret
    const authHeader = req.headers.get('Authorization')
    const expected = `Bearer ${process.env.INTERNAL_API_SECRET}`
    if (!authHeader || authHeader !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, booking_id }: { type: NotificationType; booking_id: string } = body

    if (!type || !booking_id) {
      return NextResponse.json({ error: 'type and booking_id are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch booking with customer + boat
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, boat:boats(*), customer:customers(*)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const customer = booking.customer as { full_name: string; email: string } | null
    const boat = booking.boat as { name: string } | null

    if (!customer?.email) {
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 })
    }

    // Call appropriate email function
    if (type === 'confirmation') {
      await sendBookingConfirmation({
        to: customer.email,
        customerName: customer.full_name,
        boatName: boat?.name ?? 'Boat',
        startTime: booking.start_time,
        endTime: booking.end_time,
        totalPrice: booking.total_price,
        bookingId: booking_id,
      })
    } else if (type === 'reminder') {
      await sendBookingReminder({
        to: customer.email,
        customerName: customer.full_name,
        boatName: boat?.name ?? 'Boat',
        startTime: booking.start_time,
        bookingId: booking_id,
      })
    } else if (type === 'cancellation') {
      await sendBookingCancellation({
        to: customer.email,
        customerName: customer.full_name,
        boatName: boat?.name ?? 'Boat',
        bookingId: booking_id,
      })
    } else {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    // Log to notifications table
    await supabase.from('notifications').insert({
      org_id: booking.org_id,
      booking_id,
      type,
      channel: 'email',
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('Notification send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
