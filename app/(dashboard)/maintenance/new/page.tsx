'use client'

import { useState, useEffect } from 'react'
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
import type { Boat } from '@/types/database'

interface FormState {
  boat_id: string
  type: string
  description: string
  status: string
  vendor: string
  estimated_cost: string
  actual_cost: string
  estimated_hours: string
  actual_hours: string
}

const INITIAL: FormState = {
  boat_id: '',
  type: 'routine',
  description: '',
  status: 'scheduled',
  vendor: '',
  estimated_cost: '',
  actual_cost: '',
  estimated_hours: '',
  actual_hours: '',
}

export default function NewMaintenancePage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [boats, setBoats] = useState<Boat[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/boats')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBoats(data)
      })
      .catch(() => {/* ignore */})
  }, [])

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.boat_id || !form.description.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boat_id: form.boat_id,
          type: form.type,
          description: form.description.trim(),
          status: form.status,
          vendor: form.vendor.trim() || undefined,
          estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined,
          actual_cost: form.actual_cost ? Number(form.actual_cost) : undefined,
          estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
          actual_hours: form.actual_hours ? Number(form.actual_hours) : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create log')
      }

      router.push('/maintenance')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create log')
      setSubmitting(false)
    }
  }

  const canSubmit = form.boat_id && form.description.trim().length > 0

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Log Maintenance Work"
        action={
          <Button variant="ghost" size="sm" render={<Link href="/maintenance" />}>
            Cancel
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
          {/* Job details */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="boat_id">
                  Boat <span className="text-red-500">*</span>
                </Label>
                <Select value={form.boat_id} onValueChange={(v) => set('boat_id', v ?? '')}>
                  <SelectTrigger id="boat_id">
                    <SelectValue placeholder="Select a boat" />
                  </SelectTrigger>
                  <SelectContent>
                    {boats.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Type</Label>
                  <Select value={form.type} onValueChange={(v) => set('type', v ?? 'routine')}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.status} onValueChange={(v) => set('status', v ?? 'scheduled')}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Describe the maintenance work…"
                  rows={3}
                  required
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vendor">Vendor (optional)</Label>
                <Input
                  id="vendor"
                  value={form.vendor}
                  onChange={(e) => set('vendor', e.target.value)}
                  placeholder="e.g. Marina Pro Services"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cost & Hours */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-900">Cost & Hours</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="estimated_cost">Estimated cost ($)</Label>
                  <Input
                    id="estimated_cost"
                    type="number"
                    value={form.estimated_cost}
                    onChange={(e) => set('estimated_cost', e.target.value)}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="actual_cost">Actual cost ($)</Label>
                  <Input
                    id="actual_cost"
                    type="number"
                    value={form.actual_cost}
                    onChange={(e) => set('actual_cost', e.target.value)}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="estimated_hours">Estimated hours</Label>
                  <Input
                    id="estimated_hours"
                    type="number"
                    value={form.estimated_hours}
                    onChange={(e) => set('estimated_hours', e.target.value)}
                    placeholder="e.g. 2"
                    min={0}
                    step={0.5}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="actual_hours">Actual hours</Label>
                  <Input
                    id="actual_hours"
                    type="number"
                    value={form.actual_hours}
                    onChange={(e) => set('actual_hours', e.target.value)}
                    placeholder="e.g. 2.5"
                    min={0}
                    step={0.5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-3 pb-6">
            <Button type="button" variant="outline" render={<Link href="/maintenance" />}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !canSubmit}>
              {submitting ? 'Saving…' : 'Save Log'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
