import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkConflict } from '@/lib/availability'

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
    const boatId = searchParams.get('boat_id')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end query params are required' }, { status: 400 })
    }

    const startDate = new Date(start)
    const endDate = new Date(end)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    if (startDate >= endDate) {
      return NextResponse.json({ error: 'start must be before end' }, { status: 400 })
    }

    // Single boat availability
    if (boatId) {
      const conflict = await checkConflict(boatId, startDate, endDate)
      return NextResponse.json({ available: !conflict })
    }

    // All boats availability for the org
    const { data: boats, error: boatsError } = await supabase
      .from('boats')
      .select('id, name, status')
      .eq('org_id', profile.org_id)
      .not('status', 'eq', 'inactive')

    if (boatsError) return NextResponse.json({ error: boatsError.message }, { status: 500 })

    const results = await Promise.all(
      (boats ?? []).map(async (boat) => {
        // Boats in maintenance are not available
        if (boat.status === 'maintenance') {
          return { boat_id: boat.id, name: boat.name, available: false }
        }
        const conflict = await checkConflict(boat.id, startDate, endDate)
        return { boat_id: boat.id, name: boat.name, available: !conflict }
      })
    )

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
