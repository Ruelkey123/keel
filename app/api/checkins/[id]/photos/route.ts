import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(
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
    const { data: checkin } = await supabase
      .from('checkins')
      .select('*, booking:bookings(org_id)')
      .eq('id', id)
      .single()

    if (!checkin) return NextResponse.json({ error: 'Checkin not found' }, { status: 404 })

    const booking = checkin.booking as { org_id: string } | null
    if (!booking || booking.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const phase = formData.get('phase') as string | null

    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 })
    if (!phase || !['in', 'out'].includes(phase)) {
      return NextResponse.json({ error: 'phase must be "in" or "out"' }, { status: 400 })
    }

    const timestamp = Date.now()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${profile.org_id}/${id}/${phase}/${timestamp}.${ext}`

    const adminClient = createAdminClient()
    const { error: uploadError } = await adminClient.storage
      .from('checkin-photos')
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: publicUrlData } = adminClient.storage
      .from('checkin-photos')
      .getPublicUrl(path)

    const { data: photo, error: photoError } = await supabase
      .from('checkin_photos')
      .insert({
        checkin_id: id,
        phase,
        url: publicUrlData.publicUrl,
      })
      .select()
      .single()

    if (photoError) return NextResponse.json({ error: photoError.message }, { status: 500 })

    return NextResponse.json(photo, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
