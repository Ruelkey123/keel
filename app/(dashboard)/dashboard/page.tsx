import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Ship, DollarSign, Activity } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

// KPI data — will be replaced with real Supabase queries in a later phase
const KPI_CARDS = [
  {
    title: "Today's Bookings",
    value: '0',
    icon: CalendarDays,
    description: 'Reservations starting today',
  },
  {
    title: 'Active Rentals',
    value: '0',
    icon: Activity,
    description: 'Currently checked out',
  },
  {
    title: 'Fleet Available',
    value: '0',
    icon: Ship,
    description: 'Boats ready to rent',
  },
  {
    title: 'Revenue This Month',
    value: '$0',
    icon: DollarSign,
    description: 'Confirmed + completed',
  },
]

// Fleet status rows — placeholder until fleet data is fetched
const FLEET_STATUS = [
  { label: 'Available', count: 0, color: 'bg-emerald-500' },
  { label: 'Rented', count: 0, color: 'bg-sky-500' },
  { label: 'Maintenance', count: 0, color: 'bg-amber-500' },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CARDS.map(({ title, value, icon: Icon, description }) => (
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
              {FLEET_STATUS.map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
                    <span className="text-sm text-slate-600">{label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{count}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100">
                <Skeleton className="h-2 w-full rounded-full" />
                <p className="text-xs text-slate-400 mt-2">No boats added yet</p>
              </div>
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
              <EmptyState
                icon={CalendarDays}
                title="No bookings today"
                description="Bookings scheduled for today will appear here."
              />
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
            <EmptyState
              icon={Ship}
              title="No upcoming reservations"
              description="Reservations in the next 7 days will appear here once you start taking bookings."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
