import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Ship, Wrench, AlertTriangle, Search } from 'lucide-react'
import { formatCurrency, formatRelative } from '@/lib/utils'
import { BoatStatusBadge } from '@/components/fleet/BoatStatusBadge'
import { BoatDetailClient } from '@/app/(dashboard)/fleet/[id]/client'
import type { BoatWithRelations, MaintenanceType } from '@/types/database'

const MAINTENANCE_ICONS: Record<MaintenanceType, React.ElementType> = {
  routine: Wrench,
  repair: AlertTriangle,
  inspection: Search,
}

export default async function BoatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: boat } = await supabase
    .from('boats')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single()

  if (!boat) notFound()

  const [photosResult, maintenanceResult, incidentsResult] = await Promise.all([
    supabase
      .from('boat_photos')
      .select('*')
      .eq('boat_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('maintenance_logs')
      .select('*')
      .eq('boat_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('incidents')
      .select('*')
      .eq('boat_id', id)
      .order('created_at', { ascending: false }),
  ])

  const boatWithRelations: BoatWithRelations = {
    ...boat,
    photos: photosResult.data ?? [],
    maintenance_logs: maintenanceResult.data ?? [],
    incidents: incidentsResult.data ?? [],
  }

  const specs = [
    { label: 'Make', value: boat.make },
    { label: 'Model', value: boat.model },
    { label: 'Year', value: boat.year?.toString() },
    { label: 'Length', value: boat.length_ft ? `${boat.length_ft} ft` : null },
    { label: 'Capacity', value: boat.capacity_persons ? `${boat.capacity_persons} persons` : null },
    { label: 'Fuel', value: boat.fuel_type },
  ].filter((s) => s.value)

  return (
    <div className="flex flex-col h-full">
      <Header title={boat.name} />

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="relative h-48 w-full sm:h-56">
          {boat.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={boat.cover_image_url}
              alt={boat.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-400 to-blue-600">
              <Ship className="h-16 w-16 text-white/80" />
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Boat name + status + status changer */}
          <BoatDetailClient boat={boatWithRelations} />

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="photos">
                Photos ({boatWithRelations.photos?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="maintenance">
                Maintenance ({boatWithRelations.maintenance_logs?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="incidents">
                Incidents ({boatWithRelations.incidents?.length ?? 0})
              </TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4 pt-4">
              {specs.length > 0 && (
                <Card className="border border-slate-200 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <dl className="divide-y divide-slate-100">
                      {specs.map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2.5">
                          <dt className="text-sm text-slate-500">{label}</dt>
                          <dd className="text-sm font-medium text-slate-900 capitalize">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Hourly', rate: boat.hourly_rate },
                  { label: 'Half Day', rate: boat.half_day_rate },
                  { label: 'Full Day', rate: boat.full_day_rate },
                ].map(({ label, rate }) => (
                  <Card key={label} className="border border-slate-200 shadow-sm">
                    <CardContent className="px-4 py-4 text-center">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {label}
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {rate != null ? formatCurrency(rate) : '—'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Photos */}
            <TabsContent value="photos" className="pt-4">
              <BoatPhotosTab boatId={id} initialPhotos={boatWithRelations.photos ?? []} />
            </TabsContent>

            {/* Maintenance */}
            <TabsContent value="maintenance" className="pt-4">
              <BoatMaintenanceTab
                boatId={id}
                initialLogs={boatWithRelations.maintenance_logs ?? []}
                MaintenanceIcons={MAINTENANCE_ICONS}
              />
            </TabsContent>

            {/* Incidents */}
            <TabsContent value="incidents" className="pt-4">
              <BoatIncidentsTab
                boatId={id}
                initialIncidents={boatWithRelations.incidents ?? []}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// ─── Inline server-renderable sub-sections ────────────────────────────────────
// These are async server components; the interactive parts are in client.tsx

import type { BoatPhoto, MaintenanceLog, Incident } from '@/types/database'
import { BoatPhotosClient } from '@/app/(dashboard)/fleet/[id]/client'
import { BoatMaintenanceClient } from '@/app/(dashboard)/fleet/[id]/client'
import { BoatIncidentsClient } from '@/app/(dashboard)/fleet/[id]/client'

function BoatPhotosTab({
  boatId,
  initialPhotos,
}: {
  boatId: string
  initialPhotos: BoatPhoto[]
}) {
  return <BoatPhotosClient boatId={boatId} initialPhotos={initialPhotos} />
}

function BoatMaintenanceTab({
  boatId,
  initialLogs,
  MaintenanceIcons,
}: {
  boatId: string
  initialLogs: MaintenanceLog[]
  MaintenanceIcons: Record<MaintenanceType, React.ElementType>
}) {
  return (
    <BoatMaintenanceClient
      boatId={boatId}
      initialLogs={initialLogs}
      maintenanceIcons={MaintenanceIcons}
    />
  )
}

function BoatIncidentsTab({
  boatId,
  initialIncidents,
}: {
  boatId: string
  initialIncidents: Incident[]
}) {
  return <BoatIncidentsClient boatId={boatId} initialIncidents={initialIncidents} />
}
