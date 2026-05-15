import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name, email, password } = body

    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: 'full_name, email, and password are required.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Create auth user with email already confirmed
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Do NOT insert into public.users yet — org_id is required and will be set during org-setup.
    return NextResponse.json({ userId: data.user.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
