import Link from 'next/link'
import { StatusBadge } from '@/components/bookings/StatusBadge'
import { formatDateRange } from '@/lib/utils'
import type { BookingWithRelations } from '@/types/database'

interface BookingRowProps {
  booking: BookingWithRelations
}

export function BookingRow({ booking }: BookingRowProps) {
  const boatName = booking.boat?.name ?? '—'
  const customerName = booking.customer?.full_name ?? '—'

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4 text-sm font-medium text-slate-900">{boatName}</td>
      <td className="py-3 px-4 text-sm text-slate-700">{customerName}</td>
      <td className="py-3 px-4 text-sm text-slate-600">
        {formatDateRange(booking.start_time, booking.end_time)}
      </td>
      <td className="py-3 px-4">
        <StatusBadge status={booking.status} />
      </td>
      <td className="py-3 px-4">
        <Link
          href={`/bookings/${booking.id}`}
          className="text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          View
        </Link>
      </td>
    </tr>
  )
}
