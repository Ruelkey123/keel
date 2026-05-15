'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { BookingWithRelations, BookingStatus, UserRole } from '@/types/database'

interface BookingActionsProps {
  booking: BookingWithRelations
  userRole: string
}

export function BookingActions({ booking, userRole }: BookingActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  const isOwnerManager = userRole === 'owner' || userRole === 'manager'
  const status = booking.status as BookingStatus

  async function transition(newStatus: BookingStatus) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to update booking')
      }
      const updated = await res.json()
      // If checked in, redirect to checkin
      if (newStatus === 'checked_out' && updated.checkin?.id) {
        router.push(`/checkin/${updated.checkin.id}`)
        return
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function cancelBooking() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to cancel booking')
      }
      setCancelOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'completed' || status === 'canceled') {
    return null
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {loading && <LoadingSpinner size="sm" />}

        {status === 'pending' && isOwnerManager && (
          <Button
            size="sm"
            onClick={() => transition('confirmed')}
            disabled={loading}
          >
            Confirm booking
          </Button>
        )}

        {status === 'confirmed' && (
          <Button
            size="sm"
            onClick={() => transition('checked_out')}
            disabled={loading}
          >
            Check in
          </Button>
        )}

        {status === 'checked_out' && (
          <Button
            size="sm"
            onClick={() => transition('completed')}
            disabled={loading}
          >
            Check out
          </Button>
        )}

        {isOwnerManager && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setCancelOpen(true)}
            disabled={loading}
          >
            Cancel booking
          </Button>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel booking?</DialogTitle>
            <DialogDescription>
              This will set the booking status to canceled. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={loading}
            >
              Keep booking
            </Button>
            <Button
              variant="destructive"
              onClick={cancelBooking}
              disabled={loading}
            >
              {loading ? 'Canceling…' : 'Yes, cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
