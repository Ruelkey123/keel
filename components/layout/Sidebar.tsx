'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Ship,
  CalendarDays,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/fleet', label: 'Fleet', icon: Ship },
  { href: '/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/checkin', label: 'Check-in', icon: ClipboardCheck },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  userName: string
  userEmail: string
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col h-screen fixed left-0 top-0 bg-slate-50 border-r border-slate-200 z-20">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-200">
        <div className="h-7 w-7 rounded-md bg-slate-900 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">K</span>
        </div>
        <span className="text-lg font-bold text-slate-900 tracking-tight">Keel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sky-50 text-sky-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon
                className={cn('h-4 w-4 shrink-0', isActive ? 'text-sky-500' : 'text-slate-400')}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
        >
          <LogOut className="h-4 w-4 text-slate-400" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
