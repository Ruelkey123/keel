'use client'

import { useEffect, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import type { Waiver } from '@/types/database'

interface WaiverSectionProps {
  bookingId: string
  waiverSigned: boolean
  waiverSignedAt?: string | null
  waiverId?: string | null
}

export function WaiverSection({
  bookingId,
  waiverSigned,
  waiverSignedAt,
  waiverId,
}: WaiverSectionProps) {
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [selectedWaiverId, setSelectedWaiverId] = useState<string>(waiverId ?? '')
  const [signed, setSigned] = useState(waiverSigned)
  const [signedAt, setSignedAt] = useState(waiverSignedAt ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sigCanvasRef = useRef<SignatureCanvas>(null)

  useEffect(() => {
    if (waiverSigned) return
    let cancelled = false
    fetch('/api/waivers')
      .then((res) => res.ok ? res.json() : [])
      .then((data: Waiver[]) => {
        if (!cancelled) setWaivers(data.filter((w) => w.is_active))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [waiverSigned])

  function handleClear() {
    sigCanvasRef.current?.clear()
  }

  async function handleSign() {
    if (!selectedWaiverId) {
      setError('Please select a waiver template.')
      return
    }
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setError('Please draw your signature.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const signatureData = sigCanvasRef.current.toDataURL('image/png')

      const res = await fetch(`/api/bookings/${bookingId}/sign-waiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waiver_id: selectedWaiverId,
          signature_data: signatureData,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSigned(true)
        setSignedAt(data.signed_at ?? new Date().toISOString())
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to sign waiver.')
      }
    } catch {
      setError('Failed to sign waiver.')
    } finally {
      setLoading(false)
    }
  }

  if (signed) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
          Waiver signed
        </span>
        {signedAt && (
          <span className="text-xs text-slate-400">
            {new Date(signedAt).toLocaleString()}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Waiver selector */}
      <div className="space-y-1.5">
        <label htmlFor="waiver-select" className="block text-xs font-medium text-slate-600">
          Select waiver template
        </label>
        {waivers.length === 0 ? (
          <p className="text-sm text-slate-400">
            No active waiver templates. Add one in{' '}
            <a href="/settings/waivers" className="text-sky-600 hover:underline">
              Settings &rarr; Waivers
            </a>
            .
          </p>
        ) : (
          <select
            id="waiver-select"
            value={selectedWaiverId}
            onChange={(e) => setSelectedWaiverId(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Choose a waiver…</option>
            {waivers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Signature canvas */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-600">Customer signature</label>
        <div className="rounded-md border border-slate-200 bg-slate-50 overflow-hidden">
          <SignatureCanvas
            ref={sigCanvasRef}
            penColor="#0f172a"
            canvasProps={{
              className: 'w-full h-40',
              style: { touchAction: 'none' },
            }}
            backgroundColor="rgb(248,250,252)"
          />
        </div>
        <p className="text-xs text-slate-400">Draw signature above using mouse or touch</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 rounded-md bg-red-50 border border-red-200 px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClear}
          disabled={loading}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSign}
          disabled={loading || waivers.length === 0}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40 transition-colors"
        >
          {loading ? 'Signing…' : 'Sign waiver'}
        </button>
      </div>
    </div>
  )
}
