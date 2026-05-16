'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, AlertTriangle, Wrench, Search, Ship } from 'lucide-react'
import { BoatStatusBadge } from '@/components/fleet/BoatStatusBadge'
import { PhotoUploader } from '@/components/fleet/PhotoUploader'
import { MaintenanceForm } from '@/components/fleet/MaintenanceForm'
import { IncidentForm } from '@/components/fleet/IncidentForm'
import { formatRelative, formatCurrency } from '@/lib/utils'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import type {
  BoatWithRelations,
  BoatStatus,
  BoatPhoto,
  MaintenanceLog,
  MaintenanceType,
  Incident,
} from '@/types/database'

// ─── Status Changer ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: BoatStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
]

export function BoatDetailClient({ boat }: { boat: BoatWithRelations }) {
  const router = useRouter()
  const [status, setStatus] = useState<BoatStatus>(boat.status)
  const [updating, setUpdating] = useState(false)

  async function changeStatus(newStatus: BoatStatus) {
    if (newStatus === status) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/boats/${boat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setStatus(newStatus)
        router.refresh()
      }
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-slate-900 truncate">{boat.name}</h2>
        {(boat.make || boat.model) && (
          <p className="text-sm text-slate-500">
            {[boat.make, boat.model].filter(Boolean).join(' ')}
            {boat.year ? ` · ${boat.year}` : ''}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" disabled={updating} className="gap-1.5">
              <BoatStatusBadge status={status} />
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {STATUS_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => changeStatus(opt.value)}
              className={opt.value === status ? 'font-semibold' : ''}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ─── Photos Tab ────────────────────────────────────────────────────────────────

export function BoatPhotosClient({
  boatId,
  initialPhotos,
}: {
  boatId: string
  initialPhotos: BoatPhoto[]
}) {
  const [photos, setPhotos] = useState<BoatPhoto[]>(initialPhotos)

  function handleUpload(photo: BoatPhoto) {
    setPhotos((prev) => [photo, ...prev])
  }

  return (
    <div className="space-y-4">
      <PhotoUploader boatId={boatId} onUpload={handleUpload} />
      {photos.length === 0 ? (
        <EmptyState icon={Ship} title="No photos yet" description="Upload a photo above." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? 'Boat photo'}
                className="h-36 w-full object-cover"
              />
              {photo.caption && (
                <p className="px-2 py-1.5 text-xs text-slate-500">{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Maintenance Tab ───────────────────────────────────────────────────────────

const DEFAULT_MAINTENANCE_ICONS: Record<MaintenanceType, React.ElementType> = {
  routine: Wrench,
  repair: AlertTriangle,
  inspection: Search,
}

const STATUS_BADGE_STYLES: Record<'scheduled' | 'in_progress' | 'completed', string> = {
  scheduled: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-0',
  in_progress: 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-0',
  completed: 'bg-green-100 text-green-700 hover:bg-green-100 border-0',
}

const STATUS_LABELS: Record<'scheduled' | 'in_progress' | 'completed', string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export function BoatMaintenanceClient({
  boatId,
  initialLogs,
  maintenanceIcons = DEFAULT_MAINTENANCE_ICONS,
}: {
  boatId: string
  initialLogs: MaintenanceLog[]
  maintenanceIcons?: Record<MaintenanceType, React.ElementType>
}) {
  const [logs, setLogs] = useState<MaintenanceLog[]>(initialLogs)

  function handleCreated(log: MaintenanceLog) {
    setLogs((prev) => [log, ...prev])
  }

  const totalCost = logs.reduce((sum, log) => {
    return sum + (log.actual_cost ?? log.estimated_cost ?? 0)
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">
            Total maintenance cost:{' '}
            <span className="font-bold text-slate-900">{formatCurrency(totalCost)}</span>
          </p>
        </div>
        <MaintenanceForm boatId={boatId} onCreated={handleCreated} />
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance logs"
          description="Log maintenance events to track service history."
        />
      ) : (
        <ol className="relative border-l border-slate-200 pl-6 space-y-5">
          {logs.map((log) => {
            const Icon = maintenanceIcons[log.type] ?? Wrench
            const logStatus = (log.status ?? 'scheduled') as 'scheduled' | 'in_progress' | 'completed'
            const displayCost = log.actual_cost ?? log.estimated_cost
            const costLabel = log.actual_cost != null ? 'Actual' : 'Est.'
            const displayHours = log.actual_hours ?? log.estimated_hours
            const hoursLabel = log.actual_hours != null ? 'actual hrs' : 'est. hrs'
            return (
              <li key={log.id} className="relative">
                <span className="absolute -left-[1.85rem] flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm">
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                </span>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {log.type}
                    </span>
                    <Badge className={`text-xs ${STATUS_BADGE_STYLES[logStatus]}`}>
                      {STATUS_LABELS[logStatus]}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {formatRelative(log.created_at)}
                    </span>
                    {log.resolved_at && (
                      <Badge variant="secondary" className="text-xs ml-auto">
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-700">{log.description}</p>
                  {(log.vendor || displayCost != null || displayHours != null) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {log.vendor && (
                        <span className="text-xs text-slate-500">
                          <span className="font-medium">Vendor:</span> {log.vendor}
                        </span>
                      )}
                      {displayCost != null && (
                        <span className="text-xs text-slate-500">
                          <span className="font-medium">{costLabel} cost:</span>{' '}
                          {formatCurrency(displayCost)}
                        </span>
                      )}
                      {displayHours != null && (
                        <span className="text-xs text-slate-500">
                          {displayHours} {hoursLabel}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

// ─── Incidents Tab ─────────────────────────────────────────────────────────────

export function BoatIncidentsClient({
  boatId,
  initialIncidents,
}: {
  boatId: string
  initialIncidents: Incident[]
}) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents)

  function handleCreated(incident: Incident) {
    setIncidents((prev) => [incident, ...prev])
  }

  async function handleResolve(incidentId: string) {
    const res = await fetch(`/api/boats/${boatId}/incidents`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: incidentId, status: 'resolved' }),
    })
    if (res.ok) {
      const updated: Incident = await res.json()
      setIncidents((prev) => prev.map((i) => (i.id === incidentId ? updated : i)))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <IncidentForm boatId={boatId} onCreated={handleCreated} />
      </div>

      {incidents.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No incidents reported"
          description="Any incidents reported for this boat will appear here."
        />
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{incident.title}</p>
                    <Badge
                      className={
                        incident.status === 'open'
                          ? 'bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs'
                          : 'bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs'
                      }
                    >
                      {incident.status === 'open' ? 'Open' : 'Resolved'}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {formatRelative(incident.created_at)}
                    </span>
                  </div>
                  {incident.description && (
                    <p className="mt-1 text-sm text-slate-600">{incident.description}</p>
                  )}
                </div>
                {incident.status === 'open' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs"
                    onClick={() => handleResolve(incident.id)}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
