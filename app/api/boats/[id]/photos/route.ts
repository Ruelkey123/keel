import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${profile.org_id}/${boatId}/${timestamp}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('boat-photos')
      .upload(path, buffer, { contentType: file.type })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 })

    const {
      data: { publicUrl },
    } = supabase.storage.from('boat-photos').getPublicUrl(path)

    const { data: photo, error: insertError } = await supabase
      .from('boat_photos')
      .insert({
        boat_id: boatId,
        url: publicUrl,
        caption: null,
      })
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })

    return NextResponse.json(photo, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
