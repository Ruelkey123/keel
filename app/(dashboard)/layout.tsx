import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { RealTimeProvider } from '@/components/shared/RealTimeProvider'
import { ThemeProvider } from '@/components/shared/ThemeProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Proxy (proxy.ts) handles unauthenticated redirects — no redirect here to avoid loops
  let userName = user?.email ?? 'User'
  let userEmail = user?.email ?? ''

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (profile) {
      userName = profile.full_name
      userEmail = profile.email
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="flex h-screen overflow-hidden bg-white">
        <Sidebar userName={userName} userEmail={userEmail} />
        <RealTimeProvider>
          <div className="flex flex-col flex-1 min-w-0 md:pl-60">
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
            <MobileNav />
          </div>
        </RealTimeProvider>
      </div>
    </ThemeProvider>
  )
}
