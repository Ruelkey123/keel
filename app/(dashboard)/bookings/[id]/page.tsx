import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/bookings/StatusBadge'
import { BoatStatusBadge } from '@/components/fleet/BoatStatusBadge'
import { BookingActions } from '@/components/bookings/BookingActions'
import { PaymentSection } from '@/components/bookings/PaymentSection'
import { formatCurrency, formatDateRange } from '@/lib/utils'
import type { BookingWithRelations } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getBooking(id: string, orgId: string): Promise<BookingWithRelations | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('*, boat:boats(*), customer:customers(*), checkin:checkins(*)')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()
  return data as BookingWithRelations | null
}

export default async function BookingDetailPage({ params }: PageProps) {
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

  const booking = await getBooking(id, profile.org_id)
  if (!booking) notFound()

  const durationMs =
    new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()
  const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(1)

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Booking"
        action={
          <Button variant="ghost" size="sm" render={<Link href="/bookings" />}>
            Back to bookings
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Top summary */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={booking.status} />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mt-2">
                  {booking.boat?.name ?? 'Boat'}
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  {booking.customer?.full_name ?? '—'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {formatDateRange(booking.start_time, booking.end_time)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(booking.total_price)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Total price</p>
              </div>
            </div>

            {/* Status action bar */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <BookingActions booking={booking} userRole={profile.role} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Booking details */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-slate-900">Booking Details</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Start</span>
                  <span className="text-slate-900">{new Date(booking.start_time).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">End</span>
                  <span className="text-slate-900">{new Date(booking.end_time).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="text-slate-900">{durationHours} hours</span>
                </div>
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base price</span>
                    <span>{formatCurrency(booking.base_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Deposit</span>
                    <span>{formatCurrency(booking.deposit_amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>Total</span>
                    <span>{formatCurrency(booking.total_price)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer card */}
            {booking.customer && (
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold text-slate-900">Customer</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-2 text-sm">
                  <p className="font-medium text-slate-900">{booking.customer.full_name}</p>
                  <p className="text-slate-600">{booking.customer.email}</p>
                  {booking.customer.phone && (
                    <p className="text-slate-600">{booking.customer.phone}</p>
                  )}
                  <Link
                    href={`/customers/${booking.customer.id}`}
                    className="mt-2 inline-block text-sky-600 hover:text-sky-700 font-medium text-xs"
                  >
                    View profile →
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Boat card */}
            {booking.boat && (
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold text-slate-900">Boat</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{booking.boat.name}</p>
                    <BoatStatusBadge status={booking.boat.status} />
                  </div>
                  {(booking.boat.make || booking.boat.model) && (
                    <p className="text-slate-600">
                      {[booking.boat.make, booking.boat.model, booking.boat.year].filter(Boolean).join(' ')}
                    </p>
                  )}
                  <Link
                    href={`/fleet/${booking.boat.id}`}
                    className="mt-2 inline-block text-sky-600 hover:text-sky-700 font-medium text-xs"
                  >
                    View boat →
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Waiver status */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-slate-900">Waiver</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      booking.waiver_signed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800',
                    ].join(' ')}
                  >
                    {booking.waiver_signed ? 'Signed' : 'Unsigned'}
                  </span>
                  {booking.waiver_signed_at && (
                    <span className="text-xs text-slate-400">
                      {new Date(booking.waiver_signed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment */}
            <Card className="border border-slate-200 shadow-sm md:col-span-2">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-slate-900">Payment</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <PaymentSection
                  bookingId={booking.id}
                  bookingStatus={booking.status}
                  depositAmount={booking.deposit_amount}
                  totalPrice={booking.total_price}
                />
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {booking.notes && (
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-slate-900">Notes</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{booking.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
