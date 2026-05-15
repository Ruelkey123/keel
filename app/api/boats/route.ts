import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const status = req.nextUrl.searchParams.get('status')

    let query = supabase
      .from('boats')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: boats, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(boats)
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
    const {
      name,
      make,
      model,
      year,
      length_ft,
      status = 'available',
      hourly_rate,
      half_day_rate,
      full_day_rate,
      fuel_capacity,
      fuel_type,
      capacity_persons,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const { data: boat, error } = await supabase
      .from('boats')
      .insert({
        org_id: profile.org_id,
        name,
        make: make ?? null,
        model: model ?? null,
        year: year ? Number(year) : null,
        length_ft: length_ft ? Number(length_ft) : null,
        status,
        hourly_rate: hourly_rate != null ? Math.round(Number(hourly_rate) * 100) : null,
        half_day_rate: half_day_rate != null ? Math.round(Number(half_day_rate) * 100) : null,
        full_day_rate: full_day_rate != null ? Math.round(Number(full_day_rate) * 100) : null,
        fuel_capacity: fuel_capacity ? Number(fuel_capacity) : null,
        fuel_type: fuel_type ?? null,
        capacity_persons: capacity_persons ? Number(capacity_persons) : null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(boat, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
