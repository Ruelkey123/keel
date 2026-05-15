import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkConflict } from '@/lib/availability'
import type { BookingStatus, UserRole } from '@/types/database'

type RouteContext = { params: Promise<{ id: string }> }

const OWNER_MANAGER: UserRole[] = ['owner', 'manager']

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

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*, boat:boats(*), customer:customers(*), checkin:checkins(*)')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single()

    if (error || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    return NextResponse.json(booking)
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

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { data: existing, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const body = await req.json()
    const { status: newStatus, notes, start_time, end_time } = body

    const updates: Record<string, unknown> = {}

    // Handle status transitions
    if (newStatus && newStatus !== existing.status) {
      const currentStatus = existing.status as BookingStatus
      const role = profile.role as UserRole

      // Validate transition
      const validTransitions: Record<BookingStatus, BookingStatus[]> = {
        pending: ['confirmed', 'canceled'],
        confirmed: ['checked_out', 'canceled'],
        checked_out: ['completed', 'canceled'],
        completed: [],
        canceled: [],
      }

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentStatus} to ${newStatus}` },
          { status: 422 }
        )
      }

      // Role-gated transitions
      const ownerManagerOnly: BookingStatus[] = ['confirmed', 'canceled']
      if (ownerManagerOnly.includes(newStatus) && !OWNER_MANAGER.includes(role)) {
        return NextResponse.json({ error: 'Insufficient permissions for this status change' }, { status: 403 })
      }

      updates.status = newStatus

      // pending → confirmed: send confirmation email
      if (newStatus === 'confirmed') {
        // Fire-and-forget — don't block the response
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
          },
          body: JSON.stringify({ type: 'confirmation', booking_id: id }),
        }).catch(() => {
          // Non-critical — log but don't fail the booking update
        })
      }

      // confirmed → checked_out: create checkin record + set boat to rented
      if (newStatus === 'checked_out') {
        const { data: checkin, error: checkinError } = await supabase
          .from('checkins')
          .insert({
            booking_id: id,
            checked_in_at: new Date().toISOString(),
            checked_in_by: user.id,
            damage_noted: false,
          })
          .select()
          .single()

        if (checkinError) {
          return NextResponse.json({ error: checkinError.message }, { status: 500 })
        }

        await supabase
          .from('boats')
          .update({ status: 'rented' })
          .eq('id', existing.boat_id)
      }

      // checked_out → completed: set boat back to available
      if (newStatus === 'completed') {
        await supabase
          .from('boats')
          .update({ status: 'available' })
          .eq('id', existing.boat_id)
      }
    }

    // Handle notes update
    if (notes !== undefined) {
      updates.notes = notes
    }

    // Handle time updates (with conflict check)
    if (start_time !== undefined || end_time !== undefined) {
      const newStart = start_time ? new Date(start_time) : new Date(existing.start_time)
      const newEnd = end_time ? new Date(end_time) : new Date(existing.end_time)

      if (newStart >= newEnd) {
        return NextResponse.json({ error: 'start_time must be before end_time' }, { status: 400 })
      }

      const hasConflict = await checkConflict(existing.boat_id, newStart, newEnd, id)
      if (hasConflict) {
        return NextResponse.json({ error: 'Boat is not available for this time slot' }, { status: 409 })
      }

      if (start_time) updates.start_time = newStart.toISOString()
      if (end_time) updates.end_time = newEnd.toISOString()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existing)
    }

    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select('*, boat:boats(*), customer:customers(*), checkin:checkins(*)')
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Only owner/manager can cancel
    if (!OWNER_MANAGER.includes(profile.role as UserRole)) {
      return NextResponse.json({ error: 'Only owners and managers can cancel bookings' }, { status: 403 })
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status, boat_id')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Set status to canceled
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'canceled' })
      .eq('id', id)
      .eq('org_id', profile.org_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // If boat was rented for this booking, set it back to available
    if (booking.status === 'checked_out') {
      await supabase
        .from('boats')
        .update({ status: 'available' })
        .eq('id', booking.boat_id)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
