import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    // Protect with internal secret
    const authHeader = req.headers.get('Authorization')
    const expected = `Bearer ${process.env.INTERNAL_API_SECRET}`
    if (!authHeader || authHeader !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const now = new Date()
    const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000) // now + 20h
    const windowEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000)   // now + 28h

    // Find confirmed bookings starting roughly "tomorrow"
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('status', 'confirmed')
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const secret = process.env.INTERNAL_API_SECRET
    let sent = 0

    for (const booking of bookings ?? []) {
      try {
        await fetch(`${appUrl}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ type: 'reminder', booking_id: booking.id }),
        })
        sent++
      } catch (err) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, err)
      }
    }

    return NextResponse.json({ sent })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
