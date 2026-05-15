'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { Payment, BookingStatus } from '@/types/database'

interface PaymentSectionProps {
  bookingId: string
  bookingStatus: BookingStatus
  depositAmount: number
  totalPrice: number
}

function paymentTypeBadge(type: string) {
  const map: Record<string, string> = {
    deposit: 'bg-blue-100 text-blue-700',
    rental: 'bg-green-100 text-green-700',
    refund: 'bg-red-100 text-red-700',
  }
  return map[type] ?? 'bg-slate-100 text-slate-600'
}

function paymentStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    succeeded: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

export function PaymentSection({
  bookingId,
  bookingStatus,
  depositAmount,
  totalPrice,
}: PaymentSectionProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments?booking_id=${bookingId}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  async function handleCollectDeposit() {
    setActionLoading(true)
    try {
      const res = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      if (res.ok) {
        toast.success('Payment link copied — share with customer to collect deposit')
        await fetchPayments()
      } else {
        const { error } = await res.json()
        toast.error(error ?? 'Failed to create deposit')
      }
    } catch {
      toast.error('Failed to create deposit')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCaptureBalance() {
    setActionLoading(true)
    try {
      const res = await fetch('/api/payments/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      if (res.ok) {
        toast.success('Balance payment initiated')
        await fetchPayments()
      } else {
        const { error } = await res.json()
        toast.error(error ?? 'Failed to capture balance')
      }
    } catch {
      toast.error('Failed to capture balance')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRefund(paymentId: string) {
    setActionLoading(true)
    try {
      const res = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      })
      if (res.ok) {
        toast.success('Refund issued successfully')
        await fetchPayments()
      } else {
        const { error } = await res.json()
        toast.error(error ?? 'Failed to issue refund')
      }
    } catch {
      toast.error('Failed to issue refund')
    } finally {
      setActionLoading(false)
    }
  }

  const depositPaid = payments.some((p) => p.type === 'deposit' && p.status !== 'failed')
  const balancePaid = payments.some((p) => p.type === 'rental' && p.status !== 'failed')
  const refundablePayments = payments.filter(
    (p) => (p.type === 'deposit' || p.type === 'rental') && p.status === 'succeeded'
  )

  return (
    <div className="space-y-4">
      {/* Payment history */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading payments…</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-slate-400">No payments recorded.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
              <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${paymentTypeBadge(payment.type)}`}>
                    {payment.type}
                  </span>
                </td>
                <td className="py-2 text-slate-700">{formatCurrency(payment.amount)}</td>
                <td className="py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${paymentStatusBadge(payment.status)}`}>
                    {payment.status}
                  </span>
                </td>
                <td className="py-2 text-slate-500">
                  {new Date(payment.created_at).toLocaleDateString()}
                </td>
                <td className="py-2 text-right">
                  {payment.type !== 'refund' && payment.status === 'succeeded' && (
                    <button
                      onClick={() => handleRefund(payment.id)}
                      disabled={actionLoading}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                    >
                      Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Summary */}
      <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
        <span className="text-slate-500">Deposit</span>
        <span className="text-slate-900">{formatCurrency(depositAmount)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Balance due</span>
        <span className="text-slate-900">{formatCurrency(totalPrice - depositAmount)}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        {!depositPaid && (bookingStatus === 'confirmed' || bookingStatus === 'pending') && (
          <button
            onClick={handleCollectDeposit}
            disabled={actionLoading}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40 transition-colors"
          >
            Collect deposit
          </button>
        )}

        {depositPaid && !balancePaid && bookingStatus === 'checked_out' && (
          <button
            onClick={handleCaptureBalance}
            disabled={actionLoading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            Capture balance
          </button>
        )}

        {refundablePayments.length === 0 && payments.length > 0 && (
          <p className="text-xs text-slate-400 self-center">No refundable payments.</p>
        )}
      </div>
    </div>
  )
}
