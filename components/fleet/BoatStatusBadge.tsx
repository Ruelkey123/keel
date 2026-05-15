import { Badge } from '@/components/ui/badge'
import type { BoatStatus } from '@/types/database'
import { cn } from '@/lib/utils'

interface BoatStatusBadgeProps {
  status: BoatStatus
  className?: string
}

const STATUS_CONFIG: Record<BoatStatus, { label: string; className: string }> = {
  available: {
    label: 'Available',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  rented: {
    label: 'Rented',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  },
}

export function BoatStatusBadge({ status, className }: BoatStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge className={cn('border-0 font-medium', config.className, className)}>
      {config.label}
    </Badge>
  )
}
