import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { RealTimeProvider } from '@/components/shared/RealTimeProvider'
import { ThemeProvider } from '@/components/shared/ThemeProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user record with org info
  const { data: userRecord } = await supabase
    .from('users')
    .select('full_name, email, org_id')
    .eq('id', user.id)
    .single()

  const userName = userRecord?.full_name ?? user.email ?? 'User'
  const userEmail = userRecord?.email ?? user.email ?? ''

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
