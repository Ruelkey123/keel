'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/bookings/StatusBadge'
import { formatDateRange } from '@/lib/utils'
import type { BookingWithRelations, BookingStatus } from '@/types/database'

interface BookingCalendarProps {
  bookings: BookingWithRelations[]
}

const STATUS_PILL_COLORS: Record<BookingStatus, string> = {
  pending: 'bg-amber-400 text-amber-900',
  confirmed: 'bg-sky-400 text-sky-900',
  checked_out: 'bg-blue-500 text-white',
  completed: 'bg-green-500 text-white',
  canceled: 'bg-slate-300 text-slate-700',
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function BookingCalendar({ bookings }: BookingCalendarProps) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Build calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [currentMonth])

  // Map bookings by day (a booking can appear on its start day)
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, BookingWithRelations[]>()
    for (const booking of bookings) {
      const key = format(parseISO(booking.start_time), 'yyyy-MM-dd')
      const existing = map.get(key) ?? []
      map.set(key, [...existing, booking])
    }
    return map
  }, [bookings])

  // Bookings for selected day
  const selectedDayBookings = useMemo(() => {
    if (!selectedDay) return []
    const key = format(selectedDay, 'yyyy-MM-dd')
    return bookingsByDay.get(key) ?? []
  }, [selectedDay, bookingsByDay])

  return (
    <div className="flex flex-col h-full">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h2 className="text-base font-semibold text-slate-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((day) => (
              <div
                key={day}
                className="py-1.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
            {calendarDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const dayBookings = bookingsByDay.get(key) ?? []
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
              const isToday = isSameDay(day, new Date())
              const overflow = dayBookings.length > 3
              const visibleBookings = dayBookings.slice(0, 3)

              return (
                <button
                  key={key}
                  className={[
                    'bg-white min-h-[80px] p-1.5 text-left hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500',
                    !isCurrentMonth ? 'opacity-40' : '',
                    isSelected ? 'ring-2 ring-inset ring-sky-500' : '',
                  ].join(' ')}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                >
                  <span
                    className={[
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1',
                      isToday ? 'bg-sky-500 text-white' : 'text-slate-700',
                    ].join(' ')}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {visibleBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className={[
                          'truncate rounded px-1 py-0.5 text-[10px] font-medium cursor-pointer',
                          STATUS_PILL_COLORS[booking.status],
                        ].join(' ')}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/bookings/${booking.id}`)
                        }}
                        title={`${booking.boat?.name ?? 'Boat'} — ${booking.customer?.full_name ?? 'Customer'}`}
                      >
                        {booking.boat?.name ?? 'Booking'}
                      </div>
                    ))}
                    {overflow && (
                      <div className="text-[10px] text-slate-500 px-1">
                        +{dayBookings.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        {selectedDay && (
          <div className="w-72 border-l border-slate-200 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-900">
                {format(selectedDay, 'EEEE, MMM d')}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedDay(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedDayBookings.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No bookings</p>
              ) : (
                selectedDayBookings.map((booking) => (
                  <button
                    key={booking.id}
                    className="w-full text-left rounded-lg border border-slate-200 p-3 hover:border-sky-300 hover:bg-sky-50 transition-colors"
                    onClick={() => router.push(`/bookings/${booking.id}`)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {booking.boat?.name ?? 'Boat'}
                      </span>
                      <StatusBadge status={booking.status} />
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      {booking.customer?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDateRange(booking.start_time, booking.end_time)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
