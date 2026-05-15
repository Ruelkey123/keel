import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boatId } = await params
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
    const { data: boat } = await supabase
      .from('boats')
      .select('id')
      .eq('id', boatId)
      .eq('org_id', profile.org_id)
      .single()

    if (!boat) return NextResponse.json({ error: 'Boat not found' }, { status: 404 })

    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('boat_id', boatId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(incidents)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boatId } = await params
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
    const { data: boat } = await supabase
      .from('boats')
      .select('id')
      .eq('id', boatId)
      .eq('org_id', profile.org_id)
      .single()

    if (!boat) return NextResponse.json({ error: 'Boat not found' }, { status: 404 })

    const body = await req.json()
    const { title, description } = body as { title: string; description?: string }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const { data: incident, error } = await supabase
      .from('incidents')
      .insert({
        boat_id: boatId,
        org_id: profile.org_id,
        reported_by: user.id,
        title,
        description: description ?? null,
        status: 'open',
        photos: [],
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(incident, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boatId } = await params
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
    const { id: incidentId, status } = body as { id: string; status: string }

    if (!incidentId || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
    }

    const resolved_at = status === 'resolved' ? new Date().toISOString() : null

    const { data: incident, error } = await supabase
      .from('incidents')
      .update({ status, resolved_at })
      .eq('id', incidentId)
      .eq('boat_id', boatId)
      .eq('org_id', profile.org_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(incident)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
