import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, timezone } = body

    if (!name || !timezone) {
      return NextResponse.json(
        { error: 'name and timezone are required.' },
        { status: 400 }
      )
    }

    // Get current authenticated user from session
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const slug = slugify(name)

    // Create organization
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({ name, slug, timezone })
      .select('id')
      .single()

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 400 })
    }

    // Get full_name from user metadata (set during signup)
    const fullName: string =
      (user.user_metadata?.full_name as string | undefined) ?? user.email ?? 'Unknown'

    // Create user record in public.users now that we have an org_id
    const { error: insertError } = await admin.from('users').insert({
      id: user.id,
      org_id: org.id,
      full_name: fullName,
      email: user.email,
      role: 'owner',
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ orgId: org.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
