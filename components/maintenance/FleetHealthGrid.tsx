'use client'

import { cn } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'

export interface BoatHealth {
  id: string
  name: string
  status: string
  lastServiceDate: string | null
  openJobs: number
  totalCost: number
}

interface FleetHealthGridProps {
  boats: BoatHealth[]
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; borderClass: string }> = {
  available: {
    label: 'Available',
    badgeClass: 'bg-green-50 text-green-700',
    borderClass: 'border-l-green-500',
  },
  rented: {
    label: 'Rented',
    badgeClass: 'bg-blue-50 text-blue-700',
    borderClass: 'border-l-blue-500',
  },
  maintenance: {
    label: 'Maintenance',
    badgeClass: 'bg-amber-50 text-amber-700',
    borderClass: 'border-l-amber-500',
  },
  inactive: {
    label: 'Inactive',
    badgeClass: 'bg-slate-100 text-slate-600',
    borderClass: 'border-l-slate-400',
  },
}

function daysSince(dateStr: string | null): string {
  if (!dateStr) return 'No service logged'
  const days = differenceInDays(new Date(), parseISO(dateStr))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function formatDollars(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function FleetHealthGrid({ boats }: FleetHealthGridProps) {
  if (boats.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {boats.map((boat) => {
        const cfg = STATUS_CONFIG[boat.status] ?? STATUS_CONFIG.inactive
        return (
          <div
            key={boat.id}
            className={cn(
              'rounded-lg border border-slate-200 bg-white shadow-sm border-l-4 px-4 py-4',
              cfg.borderClass
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="font-semibold text-slate-900 truncate text-sm leading-snug">
                {boat.name}
              </p>
              <span
                className={cn(
                  'shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  cfg.badgeClass
                )}
              >
                {cfg.label}
              </span>
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Last service</span>
                <span className="text-xs font-medium text-slate-700">
                  {daysSince(boat.lastServiceDate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Open jobs</span>
                <span
                  className={cn(
                    'text-xs font-semibold',
                    boat.openJobs > 0 ? 'text-amber-700' : 'text-slate-500'
                  )}
                >
                  {boat.openJobs}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Lifetime cost</span>
                <span className="text-xs font-semibold text-slate-900">
                  {boat.totalCost > 0 ? formatDollars(boat.totalCost) : '—'}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
