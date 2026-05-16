import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueChart } from '@/components/analytics/RevenueChart'
import { StatusPieChart } from '@/components/analytics/StatusPieChart'
import { UtilizationTable } from '@/components/analytics/UtilizationTable'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { DollarSign, CalendarDays, Activity, AlertTriangle } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ range?: string }>
}

async function fetchAnalytics(range: number, orgId: string) {
  const now = new Date()
  const from = new Date(now)
  from.setDate(from.getDate() - range)

  // Revenue from payments
  const { createClient: _create } = await import('@/lib/supabase/server')
  const supabase = await _create()

  const { data: orgBookings } = await supabase
    .from('bookings')
    .select('id')
    .eq('org_id', orgId)

  const orgBookingIds = new Set((orgBookings ?? []).map((b: { id: string }) => b.id))

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, created_at, booking_id')
    .eq('status', 'succeeded')
    .neq('type', 'refund')
    .gte('created_at', from.toISOString())
    .lte('created_at', now.toISOString())

  const filteredPayments = (payments ?? []).filter((p: { booking_id: string }) =>
    orgBookingIds.has(p.booking_id)
  )

  const totalRevenue = filteredPayments.reduce((s: number, p: { amount: number }) => s + p.amount, 0)

  const byDayMap: Record<string, number> = {}
  for (const p of filteredPayments) {
    const date = (p.created_at as string).slice(0, 10)
    byDayMap[date] = (byDayMap[date] ?? 0) + p.amount
  }
  const revenueByDay = Object.entries(byDayMap)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, start_time, end_time, boat_id')
    .eq('org_id', orgId)
    .gte('created_at', from.toISOString())
    .lte('created_at', now.toISOString())

  const totalBookings = (bookings ?? []).length
  const statusCounts: Record<string, number> = {}
  for (const b of bookings ?? []) {
    statusCounts[(b as { status: string }).status] = (statusCounts[(b as { status: string }).status] ?? 0) + 1
  }
  const bookingsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  // Boats + utilization
  const { data: boats } = await supabase
    .from('boats')
    .select('id, name')
    .eq('org_id', orgId)

  const periodMs = now.getTime() - from.getTime()
  const totalPossibleHours = periodMs / (1000 * 60 * 60)

  const boatHoursMap: Record<string, number> = {}
  for (const b of bookings ?? []) {
    if (!(b as { boat_id: string }).boat_id) continue
    const bid = (b as { boat_id: string }).boat_id
    const start = new Date((b as { start_time: string }).start_time).getTime()
    const end = new Date((b as { end_time: string }).end_time).getTime()
    const hours = (end - start) / (1000 * 60 * 60)
    boatHoursMap[bid] = (boatHoursMap[bid] ?? 0) + hours
  }

  const utilizationByBoat = (boats ?? []).map((boat: { id: string; name: string }) => {
    const hoursBooked = boatHoursMap[boat.id] ?? 0
    const utilizationRate = totalPossibleHours > 0
      ? Math.min(100, (hoursBooked / totalPossibleHours) * 100)
      : 0
    return {
      boat_id: boat.id,
      name: boat.name,
      hoursBooked: Math.round(hoursBooked * 10) / 10,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
    }
  })

  const avgUtilization =
    utilizationByBoat.length > 0
      ? utilizationByBoat.reduce((s: number, b: { utilizationRate: number }) => s + b.utilizationRate, 0) /
        utilizationByBoat.length
      : 0

  // Top boats
  const boatBookingCount: Record<string, number> = {}
  for (const b of bookings ?? []) {
    if (!(b as { boat_id: string }).boat_id) continue
    const bid = (b as { boat_id: string }).boat_id
    boatBookingCount[bid] = (boatBookingCount[bid] ?? 0) + 1
  }

  const topBoats = (boats ?? [])
    .map((boat: { id: string; name: string }) => ({
      boat_id: boat.id,
      name: boat.name,
      bookingCount: boatBookingCount[boat.id] ?? 0,
    }))
    .sort((a: { bookingCount: number }, b: { bookingCount: number }) => b.bookingCount - a.bookingCount)
    .slice(0, 5)

  // Open incidents
  const { data: openIncidents } = await supabase
    .from('incidents')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'open')

  return {
    totalRevenue,
    revenueByDay,
    totalBookings,
    bookingsByStatus,
    utilizationByBoat,
    avgUtilization,
    topBoats,
    openIncidentCount: (openIncidents ?? []).length,
  }
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { range: rangeParam } = await searchParams
  const range = rangeParam === '7' ? 7 : rangeParam === '90' ? 90 : 30

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const data = await fetchAnalytics(range, profile.org_id)

  const rangeButtons = [
    { label: 'Last 7d', value: '7' },
    { label: 'Last 30d', value: '30' },
    { label: 'Last 90d', value: '90' },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header title="Analytics" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Date range selector */}
        <div className="flex items-center gap-2">
          {rangeButtons.map((btn) => (
            <Link
              key={btn.value}
              href={`/analytics?range=${btn.value}`}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium border transition-colors',
                String(range) === btn.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900',
              ].join(' ')}
            >
              {btn.label}
            </Link>
          ))}
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-sm bg-white">
            <div className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            <div className="pb-4 px-5">
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.totalRevenue)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Last {range} days</p>
            </div>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <div className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <p className="text-sm font-medium text-slate-500">Total Bookings</p>
              <CalendarDays className="h-4 w-4 text-slate-400" />
            </div>
            <div className="pb-4 px-5">
              <p className="text-2xl font-bold text-slate-900">{data.totalBookings}</p>
              <p className="text-xs text-slate-400 mt-0.5">Last {range} days</p>
            </div>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <div className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <p className="text-sm font-medium text-slate-500">Avg Utilization</p>
              <Activity className="h-4 w-4 text-slate-400" />
            </div>
            <div className="pb-4 px-5">
              <p className="text-2xl font-bold text-slate-900">{data.avgUtilization.toFixed(1)}%</p>
              <p className="text-xs text-slate-400 mt-0.5">Fleet average</p>
            </div>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <div className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <p className="text-sm font-medium text-slate-500">Open Incidents</p>
              <AlertTriangle className="h-4 w-4 text-slate-400" />
            </div>
            <div className="pb-4 px-5">
              <p className="text-2xl font-bold text-slate-900">{data.openIncidentCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">Requires attention</p>
            </div>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue chart */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Revenue over time</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {data.revenueByDay.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No revenue data for this period.</p>
              ) : (
                <RevenueChart data={data.revenueByDay} />
              )}
            </CardContent>
          </Card>

          {/* Status pie */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Bookings by status</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {data.bookingsByStatus.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No booking data for this period.</p>
              ) : (
                <StatusPieChart data={data.bookingsByStatus} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top boats bar */}
        {data.topBoats.length > 0 && (
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Top boats by bookings</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              {data.topBoats.map((boat: { boat_id: string; name: string; bookingCount: number }) => {
                const max = data.topBoats[0]?.bookingCount ?? 1
                const pct = max > 0 ? (boat.bookingCount / max) * 100 : 0
                return (
                  <div key={boat.boat_id} className="flex items-center gap-3">
                    <span className="text-sm text-slate-700 w-32 truncate">{boat.name}</span>
                    <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{boat.bookingCount}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Utilization table */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Fleet utilization</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <UtilizationTable data={data.utilizationByBoat} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
