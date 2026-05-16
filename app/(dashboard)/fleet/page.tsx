import Link from 'next/link'
import { Ship, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import { BoatCard } from '@/components/fleet/BoatCard'
import type { Boat, BoatStatus } from '@/types/database'


async function getBoats(orgId: string): Promise<Boat[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('boats')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function FleetPage() {
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

  const boats = await getBoats(profile.org_id)

  const counts = {
    all: boats.length,
    available: boats.filter((b) => b.status === 'available').length,
    rented: boats.filter((b) => b.status === 'rented').length,
    maintenance: boats.filter((b) => b.status === 'maintenance').length,
    inactive: boats.filter((b) => b.status === 'inactive').length,
  }

  const statCards = [
    { label: 'Total', value: counts.all, color: 'text-slate-900' },
    { label: 'Available', value: counts.available, color: 'text-green-700' },
    { label: 'Rented', value: counts.rented, color: 'text-blue-700' },
    { label: 'Maintenance', value: counts.maintenance, color: 'text-amber-700' },
  ]

  function filterBoats(status: BoatStatus | 'all'): Boat[] {
    if (status === 'all') return boats
    return boats.filter((b) => b.status === status)
  }

  const tabs: { value: string; label: string; status: BoatStatus | 'all' }[] = [
    { value: 'all', label: `All (${counts.all})`, status: 'all' },
    { value: 'available', label: `Available (${counts.available})`, status: 'available' },
    { value: 'rented', label: `Rented (${counts.rented})`, status: 'rented' },
    { value: 'maintenance', label: `Maintenance (${counts.maintenance})`, status: 'maintenance' },
    { value: 'inactive', label: `Inactive (${counts.inactive})`, status: 'inactive' },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Fleet"
        action={
          <Button size="sm" render={<Link href="/fleet/new" />}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Boat
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs + grid */}
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => {
            const filtered = filterBoats(tab.status)
            return (
              <TabsContent key={tab.value} value={tab.value}>
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={Ship}
                    title={tab.value === 'all' ? 'No boats yet' : `No ${tab.label.toLowerCase().split(' ')[0]} boats`}
                    description={
                      tab.value === 'all'
                        ? 'Add your first boat to get started.'
                        : undefined
                    }
                    action={
                      tab.value === 'all' ? (
                        <Button size="sm" render={<Link href="/fleet/new" />}>
                          <Plus className="mr-1.5 h-4 w-4" />
                          Add Boat
                        </Button>
                      ) : undefined
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((boat) => (
                      <BoatCard key={boat.id} boat={boat} />
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </div>
  )
}
