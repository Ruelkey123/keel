'use client'

import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BoatPhoto } from '@/types/database'

interface PhotoUploaderProps {
  boatId: string
  onUpload: (photo: BoatPhoto) => void
}

export function PhotoUploader({ boatId, onUpload }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setError(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  function handleClear() {
    setSelectedFile(null)
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('file', selectedFile)

      const res = await fetch(`/api/boats/${boatId}/photos`, {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Upload failed')
      }

      const photo: BoatPhoto = await res.json()
      onUpload(photo)
      handleClear()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-blue-400 hover:text-blue-500"
        >
          <Upload className="h-6 w-6" />
          <span className="text-sm font-medium">Click to select a photo</span>
        </button>
      ) : (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="h-40 w-full rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {selectedFile && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          size="sm"
          className="w-full"
        >
          {uploading ? 'Uploading…' : 'Upload Photo'}
        </Button>
      )}
    </div>
  )
}
