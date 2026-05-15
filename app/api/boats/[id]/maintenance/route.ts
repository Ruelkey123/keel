import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { MaintenanceType } from '@/types/database'

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

    const { data: logs, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .eq('boat_id', boatId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(logs)
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
    const { type, description, resolved_at } = body as {
      type: MaintenanceType
      description: string
      resolved_at?: string
    }

    if (!type || !description) {
      return NextResponse.json({ error: 'type and description are required' }, { status: 400 })
    }

    const { data: log, error } = await supabase
      .from('maintenance_logs')
      .insert({
        boat_id: boatId,
        logged_by: user.id,
        type,
        description,
        resolved_at: resolved_at ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(log, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
