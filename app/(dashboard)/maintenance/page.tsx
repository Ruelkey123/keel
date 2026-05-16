import Link from 'next/link'
import { Plus, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { FleetHealthGrid } from '@/components/maintenance/FleetHealthGrid'
import { MaintenanceCharts } from '@/components/maintenance/MaintenanceCharts'
import type { MaintenanceLog, MaintenanceType, Boat } from '@/types/database'

type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed'

type LogWithBoat = MaintenanceLog & {
  boat: Pick<Boat, 'id' | 'name' | 'status'> | null
}

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

function statusBadge(status: MaintenanceStatus) {
  const map: Record<MaintenanceStatus, { label: string; className: string }> = {
    scheduled: { label: 'Scheduled', className: 'bg-slate-100 text-slate-700' },
    in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-700' },
    completed: { label: 'Completed', className: 'bg-green-50 text-green-700' },
  }
  const { label, className } = map[status] ?? map.scheduled
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}

function typeBadge(type: MaintenanceType) {
  const map: Record<MaintenanceType, { label: string; className: string }> = {
    routine: { label: 'Routine', className: 'bg-blue-50 text-blue-700' },
    repair: { label: 'Repair', className: 'bg-red-50 text-red-700' },
    inspection: { label: 'Inspection', className: 'bg-purple-50 text-purple-700' },
  }
  const { label, className } = map[type] ?? map.routine
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}

function displayCost(log: MaintenanceLog): string {
  const cents = log.actual_cost ?? log.estimated_cost
  if (cents == null) return '—'
  return formatCurrency(cents)
}

export default async function MaintenancePage({ searchParams }: PageProps) {
  const { status: statusParam } = await searchParams
  const activeTab = STATUS_TABS.find((t) => t.value === statusParam)?.value ?? 'all'

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

  // Get all boats for this org to filter maintenance logs
  const { data: boats } = await supabase
    .from('boats')
    .select('id, name, status')
    .eq('org_id', profile.org_id)

  const boatIds = (boats ?? []).map((b) => b.id)

  let logs: LogWithBoat[] = []
  if (boatIds.length > 0) {
    let query = supabase
      .from('maintenance_logs')
      .select('*, boat:boats(id, name, status)')
      .in('boat_id', boatIds)
      .order('created_at', { ascending: false })

    if (activeTab !== 'all') {
      query = query.eq('status', activeTab)
    }

    const { data } = await query
    logs = (data ?? []) as LogWithBoat[]
  }

  // Stats (always computed from full unfiltered data)
  let allLogs: LogWithBoat[] = []
  if (boatIds.length > 0) {
    const { data } = await supabase
      .from('maintenance_logs')
      .select('*, boat:boats(id, name, status)')
      .in('boat_id', boatIds)
      .order('created_at', { ascending: false })
    allLogs = (data ?? []) as LogWithBoat[]
  }

  const openJobs = allLogs.filter(
    (l) => l.status === 'scheduled' || l.status === 'in_progress'
  ).length

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const completedThisMonth = allLogs.filter(
    (l) => l.status === 'completed' && l.created_at >= startOfMonth
  ).length

  const costThisMonth = allLogs
    .filter((l) => l.status === 'completed' && l.created_at >= startOfMonth)
    .reduce((sum, l) => sum + (l.actual_cost ?? l.estimated_cost ?? 0), 0)

  const boatsInMaintenance = (boats ?? []).filter((b) => b.status === 'maintenance').length

  // Fleet health grid data
  const boatHealth = (boats ?? []).map((boat) => {
    const boatLogs = allLogs.filter((l) => l.boat_id === boat.id)
    const sorted = [...boatLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const lastServiceDate = sorted[0]?.created_at ?? null
    const openJobsCount = boatLogs.filter((l) =>
      ['scheduled', 'in_progress'].includes(l.status)
    ).length
    const totalCost = boatLogs.reduce(
      (s, l) => s + (l.actual_cost ?? l.estimated_cost ?? 0),
      0
    )
    return {
      id: boat.id,
      name: boat.name,
      status: boat.status,
      lastServiceDate,
      openJobs: openJobsCount,
      totalCost,
    }
  })

  // Status pie data
  const statusData = [
    {
      name: 'Scheduled',
      value: allLogs.filter((l) => l.status === 'scheduled').length,
      color: '#94a3b8',
    },
    {
      name: 'In Progress',
      value: allLogs.filter((l) => l.status === 'in_progress').length,
      color: '#f59e0b',
    },
    {
      name: 'Completed',
      value: allLogs.filter((l) => l.status === 'completed').length,
      color: '#10b981',
    },
  ]

  // Cost by type
  const costByType = (['routine', 'repair', 'inspection'] as const).map((type) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: Math.round(
      allLogs
        .filter((l) => l.type === type)
        .reduce((s, l) => s + (l.actual_cost ?? l.estimated_cost ?? 0), 0) / 100
    ),
    color: type === 'routine' ? '#38bdf8' : type === 'repair' ? '#f87171' : '#a78bfa',
  }))

  // Monthly spend (last 6 months)
  const monthlySpend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const year = d.getFullYear()
    const month = d.getMonth()
    const monthLogs = allLogs.filter((l) => {
      const ld = new Date(l.created_at)
      return ld.getFullYear() === year && ld.getMonth() === month
    })
    return {
      month: d.toLocaleString('default', { month: 'short' }),
      cost: Math.round(
        monthLogs.reduce((s, l) => s + (l.actual_cost ?? l.estimated_cost ?? 0), 0) / 100
      ),
    }
  })

  // Cost by boat
  const costByBoat = boatHealth
    .map((b) => ({ name: b.name, cost: Math.round(b.totalCost / 100) }))
    .sort((a, b) => b.cost - a.cost)

  const statCards = [
    { label: 'Open Jobs', value: openJobs, color: 'text-amber-700' },
    { label: 'Completed This Month', value: completedThisMonth, color: 'text-green-700' },
    { label: 'Cost This Month', value: formatCurrency(costThisMonth), color: 'text-slate-900' },
    { label: 'Boats in Maintenance', value: boatsInMaintenance, color: 'text-red-700' },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Maintenance"
        action={
          <Button size="sm" render={<Link href="/maintenance/new" />}>
            <Plus className="mr-1.5 h-4 w-4" />
            Log work
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className={cn('mt-1 text-2xl font-bold', color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Fleet Health */}
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Fleet Health
        </h2>
        <FleetHealthGrid boats={boatHealth} />

        {/* Analytics */}
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Analytics
        </h2>
        <MaintenanceCharts
          statusData={statusData}
          costByType={costByType}
          monthlySpend={monthlySpend}
          costByBoat={costByBoat}
        />

        {/* Log History */}
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Log History
        </h2>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={tab.value === 'all' ? '/maintenance' : `/maintenance?status=${tab.value}`}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.value
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Table */}
        {logs.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No maintenance logs"
            description={
              activeTab === 'all'
                ? 'Log your first maintenance job to get started.'
                : undefined
            }
            action={
              activeTab === 'all' ? (
                <Button size="sm" render={<Link href="/maintenance/new" />}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Log work
                </Button>
              ) : undefined
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
                    Type
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Description
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Vendor
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Cost
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Logged
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {log.boat?.name ?? '—'}
                    </td>
                    <td className="py-3 px-4">{typeBadge(log.type)}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-[260px]">
                      <span title={log.description}>
                        {log.description.length > 60
                          ? log.description.slice(0, 60) + '…'
                          : log.description}
                      </span>
                    </td>
                    <td className="py-3 px-4">{statusBadge(log.status)}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{log.vendor ?? '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-900 font-medium">
                      {displayCost(log)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {formatRelative(log.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      {log.boat && (
                        <Link
                          href={`/fleet/${log.boat.id}`}
                          className="text-xs text-sky-600 hover:text-sky-700 font-medium whitespace-nowrap"
                        >
                          View boat →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
