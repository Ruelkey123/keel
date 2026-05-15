import { createClient } from '@/lib/supabase/server'

export async function checkConflict(
  boatId: string,
  start: Date,
  end: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const supabase = await createClient()

  const startIso = start.toISOString()
  const endIso = end.toISOString()

  // Check booking conflicts
  let bookingQuery = supabase
    .from('bookings')
    .select('id')
    .eq('boat_id', boatId)
    .not('status', 'in', '("canceled","completed")')
    .or(`and(start_time.lt.${endIso},end_time.gt.${startIso})`)

  if (excludeBookingId) {
    bookingQuery = bookingQuery.neq('id', excludeBookingId)
  }

  const { data: bookingConflicts, error: bookingError } = await bookingQuery

  if (bookingError) throw bookingError
  if (bookingConflicts && bookingConflicts.length > 0) return true

  // Check availability block conflicts
  const { data: blockConflicts, error: blockError } = await supabase
    .from('availability_blocks')
    .select('id')
    .eq('boat_id', boatId)
    .or(`and(start_time.lt.${endIso},end_time.gt.${startIso})`)

  if (blockError) throw blockError
  return (blockConflicts?.length ?? 0) > 0
}
