import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Ship, DollarSign, Activity } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, formatDateRange } from '@/lib/utils'

async function getDashboardData(orgId: string) {
  const supabase = await createClient()

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

  // Today's bookings (start_time date = today, not canceled)
  const { data: todayBookings } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, status, boat:boats(name), customer:customers(full_name)')
    .eq('org_id', orgId)
    .gte('start_time', `${todayStr}T00:00:00`)
    .lte('start_time', `${todayStr}T23:59:59`)
    .neq('status', 'canceled')
    .order('start_time', { ascending: true })

  // Active rentals (status = checked_out)
  const { data: activeRentals } = await supabase
    .from('bookings')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'checked_out')

  // Fleet status counts
  const { data: fleetAvailable } = await supabase
    .from('boats')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'available')

  const { data: fleetRented } = await supabase
    .from('boats')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'rented')

  const { data: fleetMaintenance } = await supabase
    .from('boats')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'maintenance')

  // Revenue this calendar month (payments succeeded, not refund)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const { data: orgBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('org_id', orgId)

  const orgBookingIds = new Set((orgBookings ?? []).map((b: { id: string }) => b.id))

  const { data: monthPayments } = await supabase
    .from('payments')
    .select('amount, booking_id')
    .eq('status', 'succeeded')
    .neq('type', 'refund')
    .gte('created_at', monthStart)

  const monthRevenue = (monthPayments ?? [])
    .filter((p: { booking_id: string }) => orgBookingIds.has(p.booking_id))
    .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)

  // Upcoming reservations (next 7 days, confirmed)
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, status, boat:boats(name), customer:customers(full_name)')
    .eq('org_id', orgId)
    .eq('status', 'confirmed')
    .gt('start_time', `${todayStr}T23:59:59`)
    .lte('start_time', sevenDaysLater.toISOString())
    .order('start_time', { ascending: true })
    .limit(10)

  return {
    todayBookings: todayBookings ?? [],
    activeRentalsCount: (activeRentals ?? []).length,
    fleetAvailableCount: (fleetAvailable ?? []).length,
    fleetRentedCount: (fleetRented ?? []).length,
    fleetMaintenanceCount: (fleetMaintenance ?? []).length,
    monthRevenue,
    upcomingBookings: upcomingBookings ?? [],
  }
}

type BookingRow = {
  id: string
  start_time: string
  end_time: string
  status: string
  boat: { name: string } | { name: string }[] | null
  customer: { full_name: string } | { full_name: string }[] | null
}

function getBoatName(boat: BookingRow['boat']): string {
  if (!boat) return 'Boat'
  if (Array.isArray(boat)) return boat[0]?.name ?? 'Boat'
  return boat.name
}

function getCustomerName(customer: BookingRow['customer']): string {
  if (!customer) return '—'
  if (Array.isArray(customer)) return customer[0]?.full_name ?? '—'
  return customer.full_name
}

export default async function DashboardPage() {
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

  const data = await getDashboardData(profile.org_id)

  const kpiCards = [
    {
      title: "Today's Bookings",
      value: String(data.todayBookings.length),
      icon: CalendarDays,
      description: 'Reservations starting today',
    },
    {
      title: 'Active Rentals',
      value: String(data.activeRentalsCount),
      icon: Activity,
      description: 'Currently checked out',
    },
    {
      title: 'Fleet Available',
      value: String(data.fleetAvailableCount),
      icon: Ship,
      description: 'Boats ready to rent',
    },
    {
      title: 'Revenue This Month',
      value: formatCurrency(data.monthRevenue),
      icon: DollarSign,
      description: 'Confirmed + completed payments',
    },
  ]

  const fleetStatus = [
    { label: 'Available', count: data.fleetAvailableCount, color: 'bg-emerald-500' },
    { label: 'Rented', count: data.fleetRentedCount, color: 'bg-sky-500' },
    { label: 'Maintenance', count: data.fleetMaintenanceCount, color: 'bg-amber-500' },
  ]
  const totalBoats = data.fleetAvailableCount + data.fleetRentedCount + data.fleetMaintenanceCount

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map(({ title, value, icon: Icon, description }) => (
            <Card key={title} className="border border-slate-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
                <Icon className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent className="pb-4 px-5">
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fleet Status */}
          <Card className="border border-slate-200 shadow-sm bg-white lg:col-span-1">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Fleet Status</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              {fleetStatus.map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
                    <span className="text-sm text-slate-600">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{count}</span>
                </div>
              ))}
              {totalBoats > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                    {data.fleetAvailableCount > 0 && (
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${(data.fleetAvailableCount / totalBoats) * 100}%` }}
                      />
                    )}
                    {data.fleetRentedCount > 0 && (
                      <div
                        className="h-full bg-sky-500"
                        style={{ width: `${(data.fleetRentedCount / totalBoats) * 100}%` }}
                      />
                    )}
                    {data.fleetMaintenanceCount > 0 && (
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(data.fleetMaintenanceCount / totalBoats) * 100}%` }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{totalBoats} total boats</p>
                </div>
              )}
              {totalBoats === 0 && (
                <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">No boats added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          <Card className="border border-slate-200 shadow-sm bg-white lg:col-span-2">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">
                {"Today's Schedule"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {data.todayBookings.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No bookings today"
                  description="Bookings scheduled for today will appear here."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {(data.todayBookings as unknown as BookingRow[]).map((booking) => (
                    <li key={booking.id} className="py-2.5">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="flex items-center justify-between gap-4 hover:opacity-80 transition-opacity"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {getBoatName(booking.boat)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {getCustomerName(booking.customer)} &middot;{' '}
                            {formatDateRange(booking.start_time, booking.end_time)}
                          </p>
                        </div>
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                            booking.status === 'confirmed' ? 'bg-sky-100 text-sky-700' : '',
                            booking.status === 'checked_out' ? 'bg-violet-100 text-violet-700' : '',
                            booking.status === 'completed' ? 'bg-green-100 text-green-700' : '',
                            booking.status === 'pending' ? 'bg-amber-100 text-amber-700' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {booking.status.replace('_', ' ')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Reservations */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Upcoming Reservations
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Next 7 days
            </Badge>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {data.upcomingBookings.length === 0 ? (
              <EmptyState
                icon={Ship}
                title="No upcoming reservations"
                description="Reservations in the next 7 days will appear here once you start taking bookings."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {(data.upcomingBookings as unknown as BookingRow[]).map((booking) => (
                  <li key={booking.id} className="py-2.5">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="flex items-center justify-between gap-4 hover:opacity-80 transition-opacity"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {getBoatName(booking.boat)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getCustomerName(booking.customer)} &middot;{' '}
                          {formatDateRange(booking.start_time, booking.end_time)}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(booking.start_time).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
