import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays, List, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { BookingCalendar } from '@/components/bookings/BookingCalendar'
import { BookingRow } from '@/components/bookings/BookingRow'
import { EmptyState } from '@/components/shared/EmptyState'
import type { BookingWithRelations } from '@/types/database'

interface PageProps {
  searchParams: Promise<{ view?: string }>
}

async function getBookings(orgId: string): Promise<BookingWithRelations[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('*, boat:boats(*), customer:customers(*), checkin:checkins(*)')
    .eq('org_id', orgId)
    .order('start_time', { ascending: true })
  return (data ?? []) as BookingWithRelations[]
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { view } = await searchParams
  const isListView = view === 'list'

  const bookings = await getBookings(profile.org_id)

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Bookings"
        action={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
              <Link
                href="/bookings"
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                  !isListView ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                <CalendarDays className="h-4 w-4" />
                Calendar
              </Link>
              <Link
                href="/bookings?view=list"
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                  isListView ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                <List className="h-4 w-4" />
                List
              </Link>
            </div>

            <Button size="sm" render={<Link href="/bookings/new" />}>
              <Plus className="mr-1.5 h-4 w-4" />
              New booking
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden">
        {isListView ? (
          <div className="h-full overflow-y-auto p-6">
            {bookings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No bookings yet"
                description="Create your first booking to get started."
                action={
                  <Button size="sm" render={<Link href="/bookings/new" />}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    New booking
                  </Button>
                }
              />
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Boat
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Customer
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Date / Time
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <BookingRow key={booking.id} booking={booking} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <BookingCalendar bookings={bookings} />
        )}
      </div>
    </div>
  )
}
