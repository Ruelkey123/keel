import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/bookings/StatusBadge'
import { formatCurrency, formatDateRange } from '@/lib/utils'
import type { Booking, Customer } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

interface BookingRow extends Booking {
  boat: { id: string; name: string } | null
}

async function getCustomerData(id: string, orgId: string) {
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!customer) return null

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, boat:boats(id, name)')
    .eq('customer_id', id)
    .eq('org_id', orgId)
    .order('start_time', { ascending: false })

  return { customer: customer as Customer, bookings: (bookings ?? []) as BookingRow[] }
}

export default async function CustomerDetailPage({ params }: PageProps) {
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

  const result = await getCustomerData(id, profile.org_id)
  if (!result) notFound()

  const { customer, bookings } = result

  const completedBookings = bookings.filter((b) => b.status === 'completed')
  const totalSpent = completedBookings.reduce((sum, b) => sum + b.total_price, 0)
  const lastRental = bookings[0]?.start_time ?? null

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Customer"
        action={
          <Button variant="ghost" size="sm" render={<Link href="/customers" />}>
            Back to customers
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Customer info */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{customer.full_name}</h2>
                <p className="text-sm text-slate-600 mt-0.5">{customer.email}</p>
                {customer.phone && (
                  <p className="text-sm text-slate-500 mt-0.5">{customer.phone}</p>
                )}
                {customer.notes && (
                  <p className="text-sm text-slate-500 mt-2 italic">{customer.notes}</p>
                )}
              </div>
              <Button variant="outline" size="sm" render={<Link href={`/customers/${id}/edit`} />}>
                Edit
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="pt-5 pb-4 px-5 text-center">
                <p className="text-2xl font-bold text-slate-900">{bookings.length}</p>
                <p className="text-xs text-slate-500 mt-1">Total bookings</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="pt-5 pb-4 px-5 text-center">
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
                <p className="text-xs text-slate-500 mt-1">Total spent</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="pt-5 pb-4 px-5 text-center">
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {lastRental ? new Date(lastRental).toLocaleDateString() : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Last rental</p>
              </CardContent>
            </Card>
          </div>

          {/* Booking history */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Booking History</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {bookings.length === 0 ? (
                <p className="text-sm text-slate-400 px-5 pb-5">No bookings yet.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-y border-slate-100 bg-slate-50">
                      <th className="py-2 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Date
                      </th>
                      <th className="py-2 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Boat
                      </th>
                      <th className="py-2 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="py-2 px-5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Amount
                      </th>
                      <th className="py-2 px-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50">
                        <td className="py-3 px-5 text-sm text-slate-700">
                          {formatDateRange(booking.start_time, booking.end_time)}
                        </td>
                        <td className="py-3 px-5 text-sm text-slate-700">
                          {booking.boat?.name ?? '—'}
                        </td>
                        <td className="py-3 px-5">
                          <StatusBadge status={booking.status} />
                        </td>
                        <td className="py-3 px-5 text-sm text-slate-700">
                          {formatCurrency(booking.total_price)}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <Link
                            href={`/bookings/${booking.id}`}
                            className="text-xs font-medium text-sky-600 hover:text-sky-700"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
