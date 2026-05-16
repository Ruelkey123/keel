import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
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

    const { data: boats } = await supabase
      .from('boats')
      .select('id')
      .eq('org_id', profile.org_id)

    const boatIds = (boats ?? []).map((b) => b.id)

    if (boatIds.length === 0) {
      return NextResponse.json([])
    }

    const { data: logs, error } = await supabase
      .from('maintenance_logs')
      .select('*, boat:boats(id, name, status)')
      .in('boat_id', boatIds)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(logs)
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

    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const {
      boat_id,
      type,
      description,
      status,
      vendor,
      estimated_cost,
      actual_cost,
      estimated_hours,
      actual_hours,
    } = body

    if (!boat_id) return NextResponse.json({ error: 'boat_id is required' }, { status: 400 })
    if (!description) return NextResponse.json({ error: 'description is required' }, { status: 400 })

    // Verify the boat belongs to this org
    const { data: boat } = await supabase
      .from('boats')
      .select('id')
      .eq('id', boat_id)
      .eq('org_id', profile.org_id)
      .single()

    if (!boat) return NextResponse.json({ error: 'Boat not found' }, { status: 404 })

    const { data: log, error } = await supabase
      .from('maintenance_logs')
      .insert({
        boat_id,
        logged_by: user.id,
        type: type ?? 'routine',
        description,
        status: status ?? 'scheduled',
        vendor: vendor ?? null,
        estimated_cost: estimated_cost != null ? Math.round(Number(estimated_cost) * 100) : null,
        actual_cost: actual_cost != null ? Math.round(Number(actual_cost) * 100) : null,
        estimated_hours: estimated_hours != null ? Number(estimated_hours) : null,
        actual_hours: actual_hours != null ? Number(actual_hours) : null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(log, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
