import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { data: boat, error } = await supabase
      .from('boats')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single()

    if (error || !boat) return NextResponse.json({ error: 'Boat not found' }, { status: 404 })

    const [photosResult, maintenanceResult, incidentsResult] = await Promise.all([
      supabase
        .from('boat_photos')
        .select('*')
        .eq('boat_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('maintenance_logs')
        .select('*')
        .eq('boat_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('incidents')
        .select('*')
        .eq('boat_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    return NextResponse.json({
      ...boat,
      photos: photosResult.data ?? [],
      maintenance_logs: maintenanceResult.data ?? [],
      incidents: incidentsResult.data ?? [],
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Verify boat belongs to org
    const { data: existing } = await supabase
      .from('boats')
      .select('id')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Boat not found' }, { status: 404 })

    const body = await req.json()

    // Convert price fields from dollars to cents if present
    const updates: Record<string, unknown> = { ...body }
    for (const field of ['hourly_rate', 'half_day_rate', 'full_day_rate'] as const) {
      if (field in updates && updates[field] != null) {
        updates[field] = Math.round(Number(updates[field]) * 100)
      }
    }

    const { data: boat, error } = await supabase
      .from('boats')
      .update(updates)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(boat)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Only owners can delete boats
    if (profile.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can delete boats' }, { status: 403 })
    }

    const { error } = await supabase
      .from('boats')
      .delete()
      .eq('id', id)
      .eq('org_id', profile.org_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
