import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const now = new Date()

    const defaultFrom = new Date(now)
    defaultFrom.setDate(defaultFrom.getDate() - 30)

    const fromStr = searchParams.get('from') ?? defaultFrom.toISOString()
    const toStr = searchParams.get('to') ?? now.toISOString()

    const orgId = profile.org_id

    // Revenue: completed/succeeded payments
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, created_at, booking_id')
      .eq('status', 'succeeded')
      .neq('type', 'refund')
      .gte('created_at', fromStr)
      .lte('created_at', toStr)

    // Get booking org_ids to filter
    const { data: orgBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('org_id', orgId)

    const orgBookingIds = new Set((orgBookings ?? []).map((b: { id: string }) => b.id))

    const filteredPayments = (payments ?? []).filter((p: { booking_id: string }) =>
      orgBookingIds.has(p.booking_id)
    )

    const totalRevenue = filteredPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)

    // Revenue by day
    const byDayMap: Record<string, number> = {}
    for (const p of filteredPayments) {
      const date = p.created_at.slice(0, 10)
      byDayMap[date] = (byDayMap[date] ?? 0) + p.amount
    }
    const byDay = Object.entries(byDayMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, start_time, end_time, boat_id')
      .eq('org_id', orgId)
      .gte('created_at', fromStr)
      .lte('created_at', toStr)

    const totalBookings = (bookings ?? []).length

    const statusCounts: Record<string, number> = {}
    for (const b of bookings ?? []) {
      statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1
    }
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

    // Utilization by boat
    const { data: boats } = await supabase
      .from('boats')
      .select('id, name')
      .eq('org_id', orgId)

    const periodMs = new Date(toStr).getTime() - new Date(fromStr).getTime()
    const totalPossibleHours = periodMs / (1000 * 60 * 60)

    const boatHoursMap: Record<string, number> = {}
    for (const b of bookings ?? []) {
      if (!b.boat_id) continue
      const start = new Date(b.start_time).getTime()
      const end = new Date(b.end_time).getTime()
      const hours = (end - start) / (1000 * 60 * 60)
      boatHoursMap[b.boat_id] = (boatHoursMap[b.boat_id] ?? 0) + hours
    }

    const byBoat = (boats ?? []).map((boat: { id: string; name: string }) => {
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

    // Top boats by booking count
    const boatBookingCount: Record<string, number> = {}
    for (const b of bookings ?? []) {
      if (!b.boat_id) continue
      boatBookingCount[b.boat_id] = (boatBookingCount[b.boat_id] ?? 0) + 1
    }

    const topBoats = (boats ?? [])
      .map((boat: { id: string; name: string }) => ({
        boat_id: boat.id,
        name: boat.name,
        bookingCount: boatBookingCount[boat.id] ?? 0,
      }))
      .sort((a: { bookingCount: number }, b: { bookingCount: number }) => b.bookingCount - a.bookingCount)
      .slice(0, 5)

    // Maintenance / incidents
    const { data: incidents } = await supabase
      .from('incidents')
      .select('boat_id')
      .eq('org_id', orgId)
      .gte('created_at', fromStr)
      .lte('created_at', toStr)

    const incidentCount: Record<string, number> = {}
    for (const inc of incidents ?? []) {
      if (!inc.boat_id) continue
      incidentCount[inc.boat_id] = (incidentCount[inc.boat_id] ?? 0) + 1
    }

    const maintenance = (boats ?? [])
      .map((boat: { id: string; name: string }) => ({
        boat_id: boat.id,
        name: boat.name,
        incidentCount: incidentCount[boat.id] ?? 0,
      }))
      .filter((b: { incidentCount: number }) => b.incidentCount > 0)

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        byDay,
      },
      bookings: {
        total: totalBookings,
        byStatus,
      },
      utilization: {
        byBoat,
      },
      topBoats,
      maintenance,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
