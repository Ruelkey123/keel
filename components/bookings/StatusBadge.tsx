import { Badge } from '@/components/ui/badge'
import type { BookingStatus } from '@/types/database'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: BookingStatus
  className?: string
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  },
  checked_out: {
    label: 'Checked Out',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  canceled: {
    label: 'Canceled',
    className: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge className={cn('border-0 font-medium', config.className, className)}>
      {config.label}
    </Badge>
  )
}
