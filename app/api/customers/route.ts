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

    const { searchParams } = req.nextUrl
    const q = searchParams.get('q')

    let query = supabase
      .from('customers')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('full_name', { ascending: true })
      .limit(20)

    if (q && q.trim()) {
      query = query.or(`full_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`)
    }

    const { data: customers, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(customers ?? [])
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
    const { full_name, email, phone, notes } = body

    if (!full_name || !email) {
      return NextResponse.json({ error: 'full_name and email are required' }, { status: 400 })
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        org_id: profile.org_id,
        full_name,
        email,
        phone: phone ?? null,
        notes: notes ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(customer, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
