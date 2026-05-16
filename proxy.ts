import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth routing if Supabase isn't configured yet
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (pathname === '/') return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next({ request })
  }

  // Start with a pass-through response — Supabase will update cookies on this
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: always use getUser() not getSession() — getUser() validates with Supabase server
  const { data: { user } } = await supabase.auth.getUser()

  // Helper: redirect while preserving refreshed session cookies
  function redirectWith(url: URL) {
    const res = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie)
    })
    return res
  }

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/org-setup')
  const protectedPaths = ['/dashboard', '/fleet', '/bookings', '/customers', '/checkin', '/analytics', '/settings']
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  if (pathname === '/') {
    return redirectWith(new URL(user ? '/dashboard' : '/login', request.url))
  }

  // Authenticated user trying to access auth pages → send to dashboard
  if (user && isAuthRoute && !pathname.startsWith('/org-setup')) {
    return redirectWith(new URL('/dashboard', request.url))
  }

  // Unauthenticated user trying to access protected pages → send to login
  if (!user && isProtected) {
    return redirectWith(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
