import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json()
    const { checkin_id, damage_description } = body

    if (!checkin_id) {
      return NextResponse.json({ error: 'checkin_id is required' }, { status: 400 })
    }

    // Fetch checkin → booking → org_id
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .select('*, booking:bookings(org_id)')
      .eq('id', checkin_id)
      .single()

    if (checkinError || !checkin) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
    }

    const booking = checkin.booking as { org_id: string } | null
    if (!booking || booking.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const summary = damage_description ?? 'No damage reported'
    const content = `Damage report (AI-generated stub):

Summary: ${summary}

Recommended actions:
1. Photograph all affected areas before any repair work
2. Contact your insurance carrier within 24 hours if damage exceeds $500
3. Log this incident in the maintenance system and mark the boat as unavailable until assessed
4. Obtain a repair estimate from a certified marine technician

[This is a stub output. Replace with LLM call when ready.]`

    await supabase.from('ai_outputs').insert({
      org_id: profile.org_id,
      source_type: 'checkin',
      source_id: checkin_id,
      output_type: 'damage_report',
      content,
      model_used: 'stub',
    })

    return NextResponse.json({ content })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
