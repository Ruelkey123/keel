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
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await req.json()
    const { booking_id } = body

    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    // Fetch booking with boat + customer
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, boat:boats(*), customer:customers(*)')
      .eq('id', booking_id)
      .eq('org_id', profile.org_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const customer = booking.customer as { full_name: string; email: string } | null
    const boat = booking.boat as { name: string; make: string | null; model: string | null } | null

    const start = new Date(booking.start_time).toLocaleString()
    const end = new Date(booking.end_time).toLocaleString()
    const durationHours = (
      (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) /
      (1000 * 60 * 60)
    ).toFixed(1)
    const totalDollars = (booking.total_price / 100).toFixed(2)

    const content = `Booking summary (AI-generated stub):

Customer: ${customer?.full_name ?? 'Unknown'}
Email: ${customer?.email ?? 'N/A'}
Boat: ${boat?.name ?? 'Unknown'}${boat?.make ? ` (${[boat.make, boat.model].filter(Boolean).join(' ')})` : ''}
Start: ${start}
End: ${end}
Duration: ${durationHours} hours
Total: $${totalDollars}
Status: ${booking.status}
Waiver signed: ${booking.waiver_signed ? 'Yes' : 'No'}

Notes: ${booking.notes ?? 'None'}

[This is a stub output. Replace with LLM call when ready.]`

    await supabase.from('ai_outputs').insert({
      org_id: profile.org_id,
      source_type: 'booking',
      source_id: booking_id,
      output_type: 'booking_summary',
      content,
      model_used: 'stub',
    })

    return NextResponse.json({ content })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
