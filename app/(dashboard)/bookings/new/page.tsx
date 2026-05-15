'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { BookingForm } from '@/components/bookings/BookingForm'

export default function NewBookingPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Booking"
        action={
          <Button variant="ghost" size="sm" render={<Link href="/bookings" />}>
            Cancel
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <BookingForm />
      </div>
    </div>
  )
}
