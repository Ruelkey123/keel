'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { MaintenanceLog, MaintenanceType } from '@/types/database'

interface MaintenanceFormProps {
  boatId: string
  onCreated: (log: MaintenanceLog) => void
  trigger?: React.ReactElement
}

const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'routine', label: 'Routine' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
]

export function MaintenanceForm({ boatId, onCreated, trigger }: MaintenanceFormProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<MaintenanceType>('routine')
  const [description, setDescription] = useState('')
  const [resolvedAt, setResolvedAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/boats/${boatId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description: description.trim(),
          resolved_at: resolvedAt || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to log maintenance')
      }

      const log: MaintenanceLog = await res.json()
      onCreated(log)
      setOpen(false)
      setType('routine')
      setDescription('')
      setResolvedAt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log maintenance')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button size="sm">Log Maintenance</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Maintenance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="maint-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType((v ?? 'routine') as MaintenanceType)}>
              <SelectTrigger id="maint-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maint-desc">Description</Label>
            <Textarea
              id="maint-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the maintenance performed…"
              rows={3}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maint-resolved">Resolved at (optional)</Label>
            <Input
              id="maint-resolved"
              type="datetime-local"
              value={resolvedAt}
              onChange={(e) => setResolvedAt(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !description.trim()}>
              {submitting ? 'Saving…' : 'Save Log'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
