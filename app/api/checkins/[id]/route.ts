import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params
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

    const { data: checkin, error } = await supabase
      .from('checkins')
      .select('*, booking:bookings(*, boat:boats(*), customer:customers(*))')
      .eq('id', id)
      .single()

    if (error || !checkin) return NextResponse.json({ error: 'Checkin not found' }, { status: 404 })

    // Verify org ownership
    const booking = checkin.booking as { org_id: string } | null
    if (!booking || booking.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(checkin)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params
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

    // Verify checkin belongs to this org
    const { data: existing } = await supabase
      .from('checkins')
      .select('*, booking:bookings(id, boat_id, org_id)')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Checkin not found' }, { status: 404 })

    const booking = existing.booking as { id: string; boat_id: string; org_id: string } | null
    if (!booking || booking.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const {
      fuel_level_in,
      fuel_level_out,
      checkin_notes,
      checkout_notes,
      checklist_data,
      damage_noted,
      damage_description,
      checked_out_by,
      checked_out_at,
    } = body

    const updates: Record<string, unknown> = {}
    if (fuel_level_in !== undefined) updates.fuel_level_in = fuel_level_in
    if (fuel_level_out !== undefined) updates.fuel_level_out = fuel_level_out
    if (checkin_notes !== undefined) updates.checkin_notes = checkin_notes
    if (checkout_notes !== undefined) updates.checkout_notes = checkout_notes
    if (checklist_data !== undefined) updates.checklist_data = checklist_data
    if (damage_noted !== undefined) updates.damage_noted = damage_noted
    if (damage_description !== undefined) updates.damage_description = damage_description
    if (checked_out_by !== undefined) updates.checked_out_by = checked_out_by
    if (checked_out_at !== undefined) updates.checked_out_at = checked_out_at

    const { data: updated, error } = await supabase
      .from('checkins')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // If checked_out_at was set, complete the booking and free the boat
    if (checked_out_at) {
      await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', booking.id)

      await supabase
        .from('boats')
        .update({ status: 'available' })
        .eq('id', booking.boat_id)
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
