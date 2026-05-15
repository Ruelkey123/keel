'use client'

import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import type { CheckinPhase } from '@/types/database'

interface UploadedPhoto {
  id: string
  url: string
}

interface PhotoUploadProps {
  checkinId: string
  phase: CheckinPhase
  photos: UploadedPhoto[]
  onPhotoUploaded: (photo: UploadedPhoto) => void
  onPhotoRemoved?: (id: string) => void
}

export function PhotoUpload({
  checkinId,
  phase,
  photos,
  onPhotoUploaded,
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('phase', phase)

      try {
        const res = await fetch(`/api/checkins/${checkinId}/photos`, {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const photo = await res.json()
          onPhotoUploaded(photo)
        } else {
          const { error: err } = await res.json()
          setError(err ?? 'Upload failed')
        }
      } catch {
        setError('Upload failed')
      }
    }

    setUploading(false)
    // Reset file input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Take photos of the boat&apos;s current condition.
      </p>

      {/* Thumbnail grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Checkin photo"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-5 py-4 text-sm font-medium text-slate-600 hover:border-sky-400 hover:text-sky-600 disabled:opacity-40 transition-colors w-full justify-center min-h-12"
      >
        <Camera className="h-5 w-5" />
        {uploading ? 'Uploading…' : photos.length === 0 ? 'Take or upload photos' : 'Add more photos'}
      </button>

      {photos.length > 0 && (
        <p className="text-xs text-slate-400 text-center">{photos.length} photo{photos.length !== 1 ? 's' : ''} added</p>
      )}
    </div>
  )
}
