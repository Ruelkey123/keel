import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckinStepper } from '@/components/checkin/CheckinStepper'
import type { BookingWithRelations, Checkin } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getBookingForCheckin(bookingId: string, orgId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('bookings')
    .select('*, boat:boats(id, name), customer:customers(id, full_name), checkin:checkins(*)')
    .eq('id', bookingId)
    .eq('org_id', orgId)
    .single()

  return data as (BookingWithRelations & { checkin: Checkin | null }) | null
}

export default async function CheckinDetailPage({ params }: PageProps) {
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

  const booking = await getBookingForCheckin(id, profile.org_id)
  if (!booking) notFound()

  // Only confirmed or checked_out bookings can use this flow
  if (booking.status !== 'confirmed' && booking.status !== 'checked_out') {
    redirect(`/bookings/${id}`)
  }

  const boatName = (booking.boat as { name: string } | null)?.name ?? 'Boat'
  const customerName = (booking.customer as { full_name: string } | null)?.full_name ?? 'Customer'

  // If status is confirmed, we need to create the checkin first
  // (checkin record is created by the API on POST /api/checkins)
  // If we already have a checkin record, use it; otherwise we'll create it inline.
  let checkinId = (booking.checkin as Checkin | null)?.id ?? null
  const mode = booking.status === 'confirmed' ? 'checkin' : 'checkout'

  // If confirmed and no checkin record yet, we need to create one.
  // We do this server-side so the stepper always has a checkinId.
  if (mode === 'checkin' && !checkinId) {
    const supabaseAdmin = await createClient()
    const { data: newCheckin } = await supabaseAdmin
      .from('checkins')
      .insert({
        booking_id: id,
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
        damage_noted: false,
      })
      .select()
      .single()

    if (newCheckin) {
      checkinId = newCheckin.id
      // Update booking status to checked_out and boat to rented
      await supabaseAdmin.from('bookings').update({ status: 'checked_out' }).eq('id', id)
      await supabaseAdmin
        .from('boats')
        .update({ status: 'rented' })
        .eq('id', booking.boat_id)
    }
  }

  if (!checkinId) notFound()

  return (
    <div className="flex flex-col h-full">
      <CheckinStepper
        checkinId={checkinId}
        bookingId={id}
        boatName={boatName}
        customerName={customerName}
        mode={mode}
      />
    </div>
  )
}
