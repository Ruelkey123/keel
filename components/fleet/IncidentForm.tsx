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
import { Textarea } from '@/components/ui/textarea'
import type { Incident } from '@/types/database'

interface IncidentFormProps {
  boatId: string
  onCreated: (incident: Incident) => void
  trigger?: React.ReactElement
}

export function IncidentForm({ boatId, onCreated, trigger }: IncidentFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/boats/${boatId}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to report incident')
      }

      const incident: Incident = await res.json()
      onCreated(incident)
      setOpen(false)
      setTitle('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report incident')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ?? <Button size="sm" variant="destructive">Report Incident</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Incident</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="inc-title">Title</Label>
            <Input
              id="inc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the incident"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inc-desc">Details (optional)</Label>
            <Textarea
              id="inc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional details about what happened…"
              rows={4}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim()}
              variant="destructive"
            >
              {submitting ? 'Reporting…' : 'Report Incident'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
