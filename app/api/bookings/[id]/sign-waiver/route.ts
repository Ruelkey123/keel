import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
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

    // Get booking (verify org access)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, org_id, customer_id')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const body = await req.json()
    const { waiver_id, signature_data } = body

    if (!waiver_id) return NextResponse.json({ error: 'waiver_id is required' }, { status: 400 })
    if (!signature_data) return NextResponse.json({ error: 'signature_data is required' }, { status: 400 })

    // Get customer IP from request headers
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : (realIp ?? null)

    const now = new Date().toISOString()

    // Insert into signed_waivers
    const { data: signedWaiver, error: signError } = await supabase
      .from('signed_waivers')
      .insert({
        booking_id: id,
        customer_id: booking.customer_id,
        waiver_id,
        signature_data,
        ip_address: ipAddress,
        signed_at: now,
      })
      .select()
      .single()

    if (signError) return NextResponse.json({ error: signError.message }, { status: 400 })

    // Update booking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        waiver_signed: true,
        waiver_signed_at: now,
        waiver_id,
      })
      .eq('id', id)
      .eq('org_id', profile.org_id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

    return NextResponse.json(signedWaiver, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
