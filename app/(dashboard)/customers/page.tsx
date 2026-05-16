import Link from 'next/link'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Customer } from '@/types/database'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

async function getCustomers(orgId: string, q?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('customers')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (q && q.trim()) {
    query = query.or(`full_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`)
  }

  const { data } = await query
  return (data ?? []) as Customer[]
}

async function getBookingCounts(orgId: string, customerIds: string[]) {
  if (customerIds.length === 0) return {}
  const supabase = await createClient()
  const { data } = await supabase
    .from('bookings')
    .select('customer_id, start_time')
    .eq('org_id', orgId)
    .in('customer_id', customerIds)
    .order('start_time', { ascending: false })

  const counts: Record<string, number> = {}
  const lastDates: Record<string, string> = {}

  for (const booking of data ?? []) {
    const cid = booking.customer_id
    counts[cid] = (counts[cid] ?? 0) + 1
    if (!lastDates[cid]) {
      lastDates[cid] = booking.start_time
    }
  }

  return { counts, lastDates }
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const { q } = await searchParams
  const customers = await getCustomers(profile.org_id, q)
  const { counts = {}, lastDates = {} } = customers.length > 0
    ? await getBookingCounts(profile.org_id, customers.map((c) => c.id))
    : {}

  return (
    <div className="flex flex-col h-full">
      <Header title="Customers" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Search */}
        <div className="mb-4">
          <form method="GET">
            <input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search by name or email…"
              className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </form>
        </div>

        {customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={q ? 'No customers match your search' : 'No customers yet'}
            description={q ? 'Try a different name or email.' : 'Customers are created automatically when you add bookings.'}
          />
        ) : (
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                    Phone
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Bookings
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Last booking
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-slate-900">{customer.full_name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-slate-600">{customer.email}</p>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <p className="text-sm text-slate-600">{customer.phone ?? '—'}</p>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <p className="text-sm text-slate-600">{counts[customer.id] ?? 0}</p>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <p className="text-sm text-slate-600">
                        {lastDates[customer.id]
                          ? new Date(lastDates[customer.id]).toLocaleDateString()
                          : '—'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="text-xs font-medium text-sky-600 hover:text-sky-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
