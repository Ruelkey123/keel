'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Waiver } from '@/types/database'

export default function WaiversPage() {
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [contentUrl, setContentUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchWaivers = useCallback(async () => {
    try {
      const res = await fetch('/api/waivers')
      if (res.ok) {
        const data = await res.json()
        setWaivers(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/waivers')
      .then((r) => r.ok ? r.json() : [])
      .then((data: Waiver[]) => { if (!cancelled) { setWaivers(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const res = await fetch('/api/waivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content_url: contentUrl || null }),
      })

      if (res.ok) {
        setSuccess('Waiver template added.')
        setName('')
        setContentUrl('')
        await fetchWaivers()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to add waiver.')
      }
    } catch {
      setError('Failed to add waiver.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(waiver: Waiver) {
    try {
      await fetch(`/api/waivers/${waiver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !waiver.is_active }),
      })
      await fetchWaivers()
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/waivers/${id}`, { method: 'DELETE' })
      setConfirmDeleteId(null)
      await fetchWaivers()
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Waivers" />

      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Existing waivers */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Waiver templates</CardTitle>
            <CardDescription className="text-slate-500">
              Manage digital waiver templates that can be assigned to bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-4">Loading…</p>
            ) : waivers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No waivers yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {waivers.map((waiver) => (
                  <li key={waiver.id} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{waiver.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {waiver.content_url && (
                          <a
                            href={waiver.content_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-600 hover:underline truncate max-w-xs"
                          >
                            View document
                          </a>
                        )}
                        <span className="text-xs text-slate-400">
                          Added {new Date(waiver.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <Badge
                      className={
                        waiver.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }
                    >
                      {waiver.is_active ? 'Active' : 'Inactive'}
                    </Badge>

                    <button
                      onClick={() => handleToggle(waiver)}
                      className="text-xs text-slate-500 hover:text-slate-700 underline"
                    >
                      {waiver.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    {confirmDeleteId === waiver.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-red-600 font-medium">Delete?</span>
                        <button
                          onClick={() => handleDelete(waiver.id)}
                          disabled={deletingId === waiver.id}
                          className="text-red-600 hover:text-red-800 font-semibold disabled:opacity-40"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(waiver.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Add waiver form */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Add waiver template</CardTitle>
            <CardDescription className="text-slate-500">
              Create a new waiver template. Optionally link to a PDF or hosted waiver page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="waiver-name">Name</Label>
                <Input
                  id="waiver-name"
                  type="text"
                  placeholder="Standard liability waiver"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="waiver-url">Content URL (optional)</Label>
                <Input
                  id="waiver-url"
                  type="url"
                  placeholder="https://example.com/waiver.pdf"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  className="border-slate-200"
                />
                <p className="text-xs text-slate-400">Link to a PDF or hosted waiver page.</p>
              </div>

              {error && (
                <div className="rounded-md px-3 py-2 border text-sm bg-red-50 border-red-200 text-red-600">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md px-3 py-2 border text-sm bg-emerald-50 border-emerald-200 text-emerald-700">
                  {success}
                </div>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-md"
              >
                {saving ? 'Adding…' : 'Add waiver'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
