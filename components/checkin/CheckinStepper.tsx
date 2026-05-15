'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BoatInspection } from '@/components/checkin/steps/BoatInspection'
import { FuelLevel } from '@/components/checkin/steps/FuelLevel'
import { PhotoUpload } from '@/components/checkin/steps/PhotoUpload'
import { DamageNotes } from '@/components/checkin/steps/DamageNotes'
import { ConfirmStep } from '@/components/checkin/steps/ConfirmStep'
import type { CheckinPhase } from '@/types/database'

interface UploadedPhoto {
  id: string
  url: string
}

interface CheckinStepperProps {
  checkinId: string
  bookingId: string
  boatName: string
  customerName: string
  mode: 'checkin' | 'checkout'
}

// Step definitions
const CHECKIN_STEPS = ['Inspection', 'Fuel', 'Photos', 'Confirm'] as const
const CHECKOUT_STEPS = ['Condition', 'Fuel', 'Photos', 'Complete'] as const

export function CheckinStepper({
  checkinId,
  bookingId,
  boatName,
  customerName,
  mode,
}: CheckinStepperProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Check-in state
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [fuelLevelIn, setFuelLevelIn] = useState(50)

  // Check-out state
  const [damageNoted, setDamageNoted] = useState(false)
  const [damageDescription, setDamageDescription] = useState('')
  const [fuelLevelOut, setFuelLevelOut] = useState(50)
  const [checkoutNotes, setCheckoutNotes] = useState('')

  // Photos
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])

  const steps = mode === 'checkin' ? CHECKIN_STEPS : CHECKOUT_STEPS
  const isLastStep = step === steps.length - 1
  const phase: CheckinPhase = mode === 'checkin' ? 'in' : 'out'

  async function patchCheckin(updates: Record<string, unknown>) {
    const res = await fetch(`/api/checkins/${checkinId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error ?? 'Failed to save')
    }
    return res.json()
  }

  async function handleNext() {
    setSaving(true)
    try {
      // Save data for the current step before advancing
      if (mode === 'checkin') {
        if (step === 0) await patchCheckin({ checklist_data: checklist })
        if (step === 1) await patchCheckin({ fuel_level_in: fuelLevelIn })
        // Step 2 (photos) saves on upload; nothing extra here
      } else {
        if (step === 0) {
          await patchCheckin({
            damage_noted: damageNoted,
            damage_description: damageDescription,
            checkout_notes: checkoutNotes,
          })
        }
        if (step === 1) await patchCheckin({ fuel_level_out: fuelLevelOut })
      }
      setStep((s) => s + 1)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      if (mode === 'checkin') {
        // Already saved incrementally; checkin record is complete
        router.push(`/bookings/${bookingId}`)
      } else {
        // Final checkout: set checked_out_at to trigger completion
        await patchCheckin({
          checked_out_at: new Date().toISOString(),
        })
        router.push(`/bookings/${bookingId}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function renderStep() {
    if (mode === 'checkin') {
      switch (step) {
        case 0:
          return <BoatInspection checklist={checklist} onChange={setChecklist} />
        case 1:
          return <FuelLevel value={fuelLevelIn} onChange={setFuelLevelIn} label="Fuel level (start)" />
        case 2:
          return (
            <PhotoUpload
              checkinId={checkinId}
              phase={phase}
              photos={photos}
              onPhotoUploaded={(p) => setPhotos((prev) => [...prev, p])}
            />
          )
        case 3:
          return (
            <ConfirmStep
              summary={{
                mode,
                boatName,
                customerName,
                checklist,
                fuelLevel: fuelLevelIn,
                photoCount: photos.length,
              }}
              onConfirm={handleConfirm}
              loading={saving}
            />
          )
      }
    } else {
      switch (step) {
        case 0:
          return (
            <DamageNotes
              damageNoted={damageNoted}
              damageDescription={damageDescription}
              onDamageNotedChange={setDamageNoted}
              onDamageDescriptionChange={setDamageDescription}
            />
          )
        case 1:
          return <FuelLevel value={fuelLevelOut} onChange={setFuelLevelOut} label="Fuel level (return)" />
        case 2:
          return (
            <PhotoUpload
              checkinId={checkinId}
              phase={phase}
              photos={photos}
              onPhotoUploaded={(p) => setPhotos((prev) => [...prev, p])}
            />
          )
        case 3:
          return (
            <ConfirmStep
              summary={{
                mode,
                boatName,
                customerName,
                fuelLevel: fuelLevelOut,
                photoCount: photos.length,
                damageNoted,
                damageDescription,
              }}
              onConfirm={handleConfirm}
              loading={saving}
            />
          )
      }
    }
    return null
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-200 bg-white">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
          {mode === 'checkin' ? 'Check-in' : 'Check-out'} — {boatName}
        </p>
        <p className="text-sm text-slate-700">Customer: {customerName}</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2 px-5 py-4 bg-white border-b border-slate-100">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0',
                i < step
                  ? 'bg-sky-600 text-white'
                  : i === step
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-400',
              ].join(' ')}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span
              className={[
                'text-xs font-medium hidden sm:block',
                i === step ? 'text-slate-900' : 'text-slate-400',
              ].join(' ')}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 min-w-4 ${i < step ? 'bg-sky-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-lg">
          <h2 className="text-base font-semibold text-slate-900 mb-4">{steps[step]}</h2>
          {renderStep()}
        </div>
      </div>

      {/* Navigation */}
      {!isLastStep && (
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-white">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
              className="flex-1 min-h-12 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 min-h-12 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : 'Next'}
          </button>
        </div>
      )}
    </div>
  )
}
