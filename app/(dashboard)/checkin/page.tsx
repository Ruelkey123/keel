import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/bookings/StatusBadge'
import { formatDateRange } from '@/lib/utils'
import type { BookingWithRelations } from '@/types/database'

async function getTodaysBookings(orgId: string) {
  const supabase = await createClient()

  // Today's date range in ISO
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  // Confirmed bookings starting today or already past (overdue check-ins)
  const { data: confirmed } = await supabase
    .from('bookings')
    .select('*, boat:boats(id, name), customer:customers(id, full_name), checkin:checkins(*)')
    .eq('org_id', orgId)
    .eq('status', 'confirmed')
    .lte('start_time', todayEnd)
    .order('start_time', { ascending: true })

  // Active rentals (checked_out)
  const { data: active } = await supabase
    .from('bookings')
    .select('*, boat:boats(id, name), customer:customers(id, full_name), checkin:checkins(*)')
    .eq('org_id', orgId)
    .eq('status', 'checked_out')
    .order('start_time', { ascending: true })

  return {
    forCheckin: (confirmed ?? []) as BookingWithRelations[],
    forCheckout: (active ?? []) as BookingWithRelations[],
  }
}

export default async function CheckinPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { forCheckin, forCheckout } = await getTodaysBookings(profile.org_id)

  const isEmpty = forCheckin.length === 0 && forCheckout.length === 0

  return (
    <div className="flex flex-col h-full">
      <Header title="Check-in / Check-out" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-lg space-y-6">
          {isEmpty ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No check-ins scheduled for today"
              description="Confirmed bookings starting today will appear here."
            />
          ) : (
            <>
              {/* Check-in queue */}
              {forCheckin.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Ready for check-in ({forCheckin.length})
                  </h2>
                  <div className="space-y-3">
                    {forCheckin.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {booking.customer?.full_name ?? '—'}
                            </p>
                            <p className="text-sm text-slate-600 mt-0.5">
                              {booking.boat?.name ?? '—'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {formatDateRange(booking.start_time, booking.end_time)}
                            </p>
                          </div>
                          <Link
                            href={`/checkin/${booking.id}`}
                            className="shrink-0 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors min-h-12 flex items-center"
                          >
                            Start check-in
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Active rentals / checkout queue */}
              {forCheckout.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Active rentals ({forCheckout.length})
                  </h2>
                  <div className="space-y-3">
                    {forCheckout.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {booking.customer?.full_name ?? '—'}
                            </p>
                            <p className="text-sm text-slate-600 mt-0.5">
                              {booking.boat?.name ?? '—'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {formatDateRange(booking.start_time, booking.end_time)}
                            </p>
                            <div className="mt-1.5">
                              <StatusBadge status={booking.status} />
                            </div>
                          </div>
                          <Link
                            href={`/checkin/${booking.id}`}
                            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors min-h-12 flex items-center"
                          >
                            Check out
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
