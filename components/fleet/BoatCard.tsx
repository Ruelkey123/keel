'use client'

import Link from 'next/link'
import { Ship } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { BoatStatusBadge } from '@/components/fleet/BoatStatusBadge'
import { formatCurrency } from '@/lib/utils'
import type { Boat } from '@/types/database'

interface BoatCardProps {
  boat: Boat
}

export function BoatCard({ boat }: BoatCardProps) {
  const subtitle = [boat.make, boat.model].filter(Boolean).join(' ')

  return (
    <Link href={`/fleet/${boat.id}`} className="group block">
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm transition-shadow duration-150 group-hover:shadow-md">
        {/* Cover image / placeholder */}
        <div className="relative h-40 w-full overflow-hidden">
          {boat.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={boat.cover_image_url}
              alt={boat.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-400 to-blue-600">
              <Ship className="h-12 w-12 text-white/80" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{boat.name}</p>
              {subtitle && (
                <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>
              )}
            </div>
            <BoatStatusBadge status={boat.status} className="shrink-0" />
          </div>

          {boat.hourly_rate != null && (
            <p className="mt-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {formatCurrency(boat.hourly_rate)}
              </span>
              {' '}/ hr
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}
