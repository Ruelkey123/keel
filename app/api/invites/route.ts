import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, full_name, role } = body as {
      email: string
      full_name: string
      role: UserRole
    }

    if (!email || !full_name || !role) {
      return NextResponse.json(
        { error: 'email, full_name, and role are required.' },
        { status: 400 }
      )
    }

    const validRoles: UserRole[] = ['manager', 'dock_staff']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'role must be manager or dock_staff.' },
        { status: 400 }
      )
    }

    // Get current user to determine their org
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Fetch the inviting user's org_id
    const { data: currentUser, error: currentUserError } = await admin
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    // Only owners and managers can invite
    if (!['owner', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    // Create auth user with a temporary password; they can reset via email
    const tempPassword = crypto.randomUUID()
    const { data: newAuthUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Insert into public.users
    const { error: insertError } = await admin.from('users').insert({
      id: newAuthUser.user.id,
      org_id: currentUser.org_id,
      full_name,
      email,
      role,
    })

    if (insertError) {
      // Attempt to clean up the auth user to avoid orphans
      await admin.auth.admin.deleteUser(newAuthUser.user.id)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json(
      { message: `Invited ${full_name} (${email}) successfully.` },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
