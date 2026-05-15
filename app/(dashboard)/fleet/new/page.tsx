'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FormState {
  name: string
  make: string
  model: string
  year: string
  length_ft: string
  capacity_persons: string
  fuel_type: string
  hourly_rate: string
  half_day_rate: string
  full_day_rate: string
  status: string
}

const INITIAL: FormState = {
  name: '',
  make: '',
  model: '',
  year: '',
  length_ft: '',
  capacity_persons: '',
  fuel_type: '',
  hourly_rate: '',
  half_day_rate: '',
  full_day_rate: '',
  status: 'available',
}

export default function NewBoatPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/boats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          make: form.make.trim() || undefined,
          model: form.model.trim() || undefined,
          year: form.year ? Number(form.year) : undefined,
          length_ft: form.length_ft ? Number(form.length_ft) : undefined,
          capacity_persons: form.capacity_persons ? Number(form.capacity_persons) : undefined,
          fuel_type: form.fuel_type || undefined,
          hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
          half_day_rate: form.half_day_rate ? Number(form.half_day_rate) : undefined,
          full_day_rate: form.full_day_rate ? Number(form.full_day_rate) : undefined,
          status: form.status,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create boat')
      }

      const boat = await res.json()
      router.push(`/fleet/${boat.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create boat')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Add Boat"
        action={
          <Button variant="ghost" size="sm" render={<Link href="/fleet" />}>
            Cancel
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          {/* Basic Info */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Boat name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Sea Breeze"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    value={form.make}
                    onChange={(e) => set('make', e.target.value)}
                    placeholder="e.g. Bayliner"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={form.model}
                    onChange={(e) => set('model', e.target.value)}
                    placeholder="e.g. VR5"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={form.year}
                    onChange={(e) => set('year', e.target.value)}
                    placeholder="e.g. 2022"
                    min={1900}
                    max={2100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="length_ft">Length (ft)</Label>
                  <Input
                    id="length_ft"
                    type="number"
                    value={form.length_ft}
                    onChange={(e) => set('length_ft', e.target.value)}
                    placeholder="e.g. 20"
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="capacity_persons">Capacity (persons)</Label>
                  <Input
                    id="capacity_persons"
                    type="number"
                    value={form.capacity_persons}
                    onChange={(e) => set('capacity_persons', e.target.value)}
                    placeholder="e.g. 8"
                    min={1}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fuel_type">Fuel type</Label>
                <Select value={form.fuel_type} onValueChange={(v) => set('fuel_type', v ?? '')}>
                  <SelectTrigger id="fuel_type">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unleaded">Unleaded</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hourly_rate">Hourly rate ($)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    value={form.hourly_rate}
                    onChange={(e) => set('hourly_rate', e.target.value)}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="half_day_rate">Half-day rate ($)</Label>
                  <Input
                    id="half_day_rate"
                    type="number"
                    value={form.half_day_rate}
                    onChange={(e) => set('half_day_rate', e.target.value)}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="full_day_rate">Full-day rate ($)</Label>
                  <Input
                    id="full_day_rate"
                    type="number"
                    value={form.full_day_rate}
                    onChange={(e) => set('full_day_rate', e.target.value)}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Initial Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <Select value={form.status} onValueChange={(v) => set('status', v ?? 'available')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {error && (
            <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-3 pb-6">
            <Button type="button" variant="outline" render={<Link href="/fleet" />}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !form.name.trim()}>
              {submitting ? 'Creating…' : 'Create Boat'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
