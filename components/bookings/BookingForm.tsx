'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import type { Boat, Customer } from '@/types/database'
import type { PriceBreakdown } from '@/lib/pricing'

// Zod schemas per step
const step1Schema = z.object({
  boat_id: z.string().min(1, 'Select a boat'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
})

const step2SchemaExisting = z.object({
  customer_id: z.string().min(1, 'Select a customer'),
})

const step2SchemaNew = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
})

type Step1Values = z.infer<typeof step1Schema>

interface FormData {
  // Step 1
  boat_id: string
  start_time: string
  end_time: string
  // Step 2
  customer_id: string
  full_name: string
  email: string
  phone: string
  // Step 3
  notes: string
  useExistingCustomer: boolean
}

const INITIAL: FormData = {
  boat_id: '',
  start_time: '',
  end_time: '',
  customer_id: '',
  full_name: '',
  email: '',
  phone: '',
  notes: '',
  useExistingCustomer: true,
}

export function BookingForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(INITIAL)
  const [boats, setBoats] = useState<Boat[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [pricing, setPricing] = useState<PriceBreakdown | null>(null)
  const [availability, setAvailability] = useState<boolean | null>(null)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBoat, setSelectedBoat] = useState<Boat | null>(null)

  // Fetch boats on mount
  useEffect(() => {
    fetch('/api/boats')
      .then((r) => r.json())
      .then((data) => setBoats(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Fetch customers when query changes
  useEffect(() => {
    const qs = customerQuery.trim() ? `?q=${encodeURIComponent(customerQuery)}` : ''
    fetch(`/api/customers${qs}`)
      .then((r) => r.json())
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [customerQuery])

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Check availability when boat + times change
  const checkAvailability = useCallback(async (boatId: string, start: string, end: string) => {
    if (!boatId || !start || !end) return
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s >= e) return

    setLoadingAvailability(true)
    setAvailability(null)
    setPricing(null)

    try {
      const params = new URLSearchParams({
        boat_id: boatId,
        start: s.toISOString(),
        end: e.toISOString(),
      })
      const res = await fetch(`/api/availability?${params}`)
      const data = await res.json()
      setAvailability(data.available ?? false)

      if (data.available) {
        // Compute pricing preview
        const boat = boats.find((b) => b.id === boatId)
        if (boat) {
          const res2 = await fetch('/api/bookings', {
            method: 'POST',
            // Don't actually create — just preview. We'll compute client-side
          })
          // Compute client-side using the same logic
          const durationHours = (e.getTime() - s.getTime()) / (1000 * 60 * 60)
          let basePrice = 0
          let priceType: PriceBreakdown['priceType'] = 'hourly'

          if (durationHours >= 8 && boat.full_day_rate) {
            basePrice = boat.full_day_rate
            priceType = 'full_day'
          } else if (durationHours >= 4 && boat.half_day_rate) {
            basePrice = boat.half_day_rate
            priceType = 'half_day'
          } else {
            basePrice = Math.ceil(durationHours) * (boat.hourly_rate ?? 0)
            priceType = 'hourly'
          }

          const depositAmount = Math.round(basePrice * 0.25)
          setPricing({ basePrice, depositAmount, totalPrice: basePrice, durationHours, priceType })
        }
      }
    } catch {
      setAvailability(null)
    } finally {
      setLoadingAvailability(false)
    }
  }, [boats])

  // Re-check when relevant fields change
  useEffect(() => {
    if (formData.boat_id && formData.start_time && formData.end_time) {
      checkAvailability(formData.boat_id, formData.start_time, formData.end_time)
    } else {
      setAvailability(null)
      setPricing(null)
    }
  }, [formData.boat_id, formData.start_time, formData.end_time, checkAvailability])

  // Update selected boat
  useEffect(() => {
    setSelectedBoat(boats.find((b) => b.id === formData.boat_id) ?? null)
  }, [formData.boat_id, boats])

  // Step 1 validation
  function validateStep1(): string | null {
    if (!formData.boat_id) return 'Please select a boat'
    if (!formData.start_time) return 'Please enter a start time'
    if (!formData.end_time) return 'Please enter an end time'
    const s = new Date(formData.start_time)
    const e = new Date(formData.end_time)
    if (s >= e) return 'End time must be after start time'
    if (availability === false) return 'Boat is not available for this time slot'
    return null
  }

  // Step 2 validation
  function validateStep2(): string | null {
    if (formData.useExistingCustomer) {
      if (!formData.customer_id) return 'Please select a customer'
    } else {
      if (!formData.full_name.trim()) return 'Full name is required'
      if (!formData.email.trim()) return 'Email is required'
    }
    return null
  }

  function handleNext() {
    setError(null)
    if (step === 1) {
      const err = validateStep1()
      if (err) { setError(err); return }
    }
    if (step === 2) {
      const err = validateStep2()
      if (err) { setError(err); return }
    }
    setStep((s) => s + 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        boat_id: formData.boat_id,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        notes: formData.notes.trim() || undefined,
      }

      if (formData.useExistingCustomer) {
        body.customer_id = formData.customer_id
      } else {
        body.customer = {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
        }
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create booking')
      }

      const booking = await res.json()
      router.push(`/bookings/${booking.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking')
      setSubmitting(false)
    }
  }

  const selectedCustomer = customers.find((c) => c.id === formData.customer_id)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                step === s
                  ? 'bg-sky-500 text-white'
                  : step > s
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-100 text-slate-400',
              ].join(' ')}
            >
              {s}
            </div>
            <span className={`text-sm ${step === s ? 'font-medium text-slate-900' : 'text-slate-400'}`}>
              {s === 1 ? 'Boat & Time' : s === 2 ? 'Customer' : 'Review'}
            </span>
            {s < 3 && <div className="h-px w-8 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Boat + Time */}
      {step === 1 && (
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Select Boat &amp; Time</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="space-y-1.5">
              <Label>Boat</Label>
              <Select
                value={formData.boat_id}
                onValueChange={(v) => set('boat_id', v ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a boat…" />
                </SelectTrigger>
                <SelectContent>
                  {boats.filter((b) => b.status !== 'inactive').map((boat) => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.name}{boat.status === 'maintenance' ? ' (maintenance)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start_time">Start time</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => set('start_time', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_time">End time</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => set('end_time', e.target.value)}
                />
              </div>
            </div>

            {/* Availability + Pricing Preview */}
            {formData.boat_id && formData.start_time && formData.end_time && (
              <div className="rounded-lg border border-slate-200 p-3">
                {loadingAvailability ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <LoadingSpinner size="sm" /> Checking availability…
                  </div>
                ) : availability === null ? null : availability === false ? (
                  <p className="text-sm text-red-600 font-medium">
                    Boat is not available for this time slot.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-700">Available</p>
                    {pricing && (
                      <div className="text-sm text-slate-600 space-y-1">
                        <div className="flex justify-between">
                          <span className="capitalize">{pricing.priceType.replace('_', ' ')} rate</span>
                          <span className="font-medium">{formatCurrency(pricing.basePrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Deposit (25%)</span>
                          <span>{formatCurrency(pricing.depositAmount)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-slate-900 border-t border-slate-100 pt-1 mt-1">
                          <span>Total</span>
                          <span>{formatCurrency(pricing.totalPrice)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Customer */}
      {step === 2 && (
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-slate-900">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                className={[
                  'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                  formData.useExistingCustomer
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                ].join(' ')}
                onClick={() => set('useExistingCustomer', true)}
              >
                Existing customer
              </button>
              <button
                type="button"
                className={[
                  'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                  !formData.useExistingCustomer
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                ].join(' ')}
                onClick={() => set('useExistingCustomer', false)}
              >
                New customer
              </button>
            </div>

            {formData.useExistingCustomer ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="customer_search">Search customers</Label>
                  <Input
                    id="customer_search"
                    placeholder="Name or email…"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                  />
                </div>
                {customers.length > 0 && (
                  <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={[
                          'w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors',
                          formData.customer_id === c.id ? 'bg-sky-50' : '',
                        ].join(' ')}
                        onClick={() => set('customer_id', c.id)}
                      >
                        <p className="text-sm font-medium text-slate-900">{c.full_name}</p>
                        <p className="text-xs text-slate-500">{c.email}</p>
                      </button>
                    ))}
                  </div>
                )}
                {formData.customer_id && selectedCustomer && (
                  <div className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-2">
                    <p className="text-sm font-medium text-sky-900">{selectedCustomer.full_name}</p>
                    <p className="text-xs text-sky-700">{selectedCustomer.email}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => set('full_name', e.target.value)}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+1 555 000 0000"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Boat</span>
                <span className="font-medium text-slate-900">{selectedBoat?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="font-medium text-slate-900">
                  {formData.useExistingCustomer
                    ? selectedCustomer?.full_name ?? '—'
                    : formData.full_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Start</span>
                <span className="font-medium text-slate-900">
                  {formData.start_time ? new Date(formData.start_time).toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">End</span>
                <span className="font-medium text-slate-900">
                  {formData.end_time ? new Date(formData.end_time).toLocaleString() : '—'}
                </span>
              </div>
              {pricing && (
                <>
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 capitalize">{pricing.priceType.replace('_', ' ')} rate</span>
                      <span>{formatCurrency(pricing.basePrice)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-500">Deposit (25%)</span>
                      <span>{formatCurrency(pricing.depositAmount)}</span>
                    </div>
                    <div className="flex justify-between mt-2 font-semibold text-slate-900">
                      <span>Total</span>
                      <span>{formatCurrency(pricing.totalPrice)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Notes</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none resize-none"
                rows={3}
                placeholder="Optional notes for this booking…"
                value={formData.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex justify-between pb-6">
        {step > 1 ? (
          <Button variant="outline" onClick={() => { setError(null); setStep((s) => s - 1) }}>
            Back
          </Button>
        ) : (
          <div />
        )}
        {step < 3 ? (
          <Button onClick={handleNext}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" /> Creating…
              </span>
            ) : (
              'Create booking'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
