import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const { booking_id } = body

    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    // Fetch booking and verify status
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('org_id', profile.org_id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: `Booking must be confirmed to check in (current: ${booking.status})` },
        { status: 422 }
      )
    }

    // Create checkin record
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .insert({
        booking_id,
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
        damage_noted: false,
      })
      .select()
      .single()

    if (checkinError) return NextResponse.json({ error: checkinError.message }, { status: 500 })

    // Update booking status to checked_out
    await supabase
      .from('bookings')
      .update({ status: 'checked_out' })
      .eq('id', booking_id)

    // Update boat status to rented
    await supabase
      .from('boats')
      .update({ status: 'rented' })
      .eq('id', booking.boat_id)

    return NextResponse.json(checkin, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
