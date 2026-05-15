import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkConflict } from '@/lib/availability'
import { calculatePrice } from '@/lib/pricing'
import type { Boat } from '@/types/database'

export async function GET(req: NextRequest) {
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

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const boatId = searchParams.get('boat_id')
    const date = searchParams.get('date') // YYYY-MM-DD
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabase
      .from('bookings')
      .select('*, boat:boats(*), customer:customers(*), checkin:checkins(*)')
      .eq('org_id', profile.org_id)
      .order('start_time', { ascending: true })

    if (status) query = query.eq('status', status)
    if (boatId) query = query.eq('boat_id', boatId)

    if (date) {
      const dayStart = `${date}T00:00:00.000Z`
      const dayEnd = `${date}T23:59:59.999Z`
      query = query.gte('start_time', dayStart).lte('start_time', dayEnd)
    } else {
      if (from) query = query.gte('start_time', from)
      if (to) query = query.lte('start_time', to)
    }

    const { data: bookings, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(bookings ?? [])
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await req.json()
    const { boat_id, customer_id, customer, start_time, end_time, notes } = body

    if (!boat_id || !start_time || !end_time) {
      return NextResponse.json({ error: 'boat_id, start_time, and end_time are required' }, { status: 400 })
    }

    const start = new Date(start_time)
    const end = new Date(end_time)

    if (start >= end) {
      return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 })
    }

    // Check conflict
    const hasConflict = await checkConflict(boat_id, start, end)
    if (hasConflict) {
      return NextResponse.json({ error: 'Boat is not available for this time slot' }, { status: 409 })
    }

    // Resolve customer
    let resolvedCustomerId = customer_id

    if (!resolvedCustomerId && customer) {
      const { full_name, email, phone } = customer
      if (!full_name || !email) {
        return NextResponse.json({ error: 'customer.full_name and customer.email are required' }, { status: 400 })
      }

      // Upsert by email
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('org_id', profile.org_id)
        .eq('email', email)
        .single()

      if (existing) {
        resolvedCustomerId = existing.id
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({ org_id: profile.org_id, full_name, email, phone: phone ?? null })
          .select()
          .single()

        if (customerError) return NextResponse.json({ error: customerError.message }, { status: 400 })
        resolvedCustomerId = newCustomer.id
      }
    }

    if (!resolvedCustomerId) {
      return NextResponse.json({ error: 'customer_id or customer object is required' }, { status: 400 })
    }

    // Fetch boat for pricing
    const { data: boat, error: boatError } = await supabase
      .from('boats')
      .select('*')
      .eq('id', boat_id)
      .eq('org_id', profile.org_id)
      .single()

    if (boatError || !boat) {
      return NextResponse.json({ error: 'Boat not found' }, { status: 404 })
    }

    const pricing = calculatePrice(boat as Boat, start, end)

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        org_id: profile.org_id,
        boat_id,
        customer_id: resolvedCustomerId,
        created_by: user.id,
        status: 'pending',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        base_price: pricing.basePrice,
        deposit_amount: pricing.depositAmount,
        total_price: pricing.totalPrice,
        waiver_signed: false,
        notes: notes ?? null,
      })
      .select('*, boat:boats(*), customer:customers(*)')
      .single()

    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 400 })

    return NextResponse.json(booking, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
