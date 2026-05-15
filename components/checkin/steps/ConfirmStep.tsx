'use client'

interface CheckinSummary {
  mode: 'checkin' | 'checkout'
  boatName: string
  customerName: string
  checklist?: Record<string, boolean>
  fuelLevel?: number
  photoCount?: number
  damageNoted?: boolean
  damageDescription?: string
  checkoutNotes?: string
}

interface ConfirmStepProps {
  summary: CheckinSummary
  onConfirm: () => void
  loading: boolean
}

const CHECKLIST_LABELS: Record<string, string> = {
  life_jackets: 'Life jackets',
  fire_extinguisher: 'Fire extinguisher',
  nav_lights: 'Navigation lights',
  bilge_pump: 'Bilge pump',
  engine_starts: 'Engine starts',
  no_damage: 'No visible damage',
}

export function ConfirmStep({ summary, onConfirm, loading }: ConfirmStepProps) {
  const { mode, boatName, customerName, checklist, fuelLevel, photoCount, damageNoted, damageDescription } = summary

  const checklistPassed = checklist
    ? Object.values(checklist).filter(Boolean).length
    : 0
  const checklistTotal = checklist ? Object.keys(checklist).length : 0

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Review the details before confirming.</p>

      {/* Summary card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
        <div className="px-4 py-3 flex justify-between text-sm">
          <span className="text-slate-500">Boat</span>
          <span className="font-medium text-slate-900">{boatName}</span>
        </div>
        <div className="px-4 py-3 flex justify-between text-sm">
          <span className="text-slate-500">Customer</span>
          <span className="font-medium text-slate-900">{customerName}</span>
        </div>

        {mode === 'checkin' && checklist && (
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-slate-500">Inspection</span>
            <span className={`font-medium ${checklistPassed === checklistTotal ? 'text-green-600' : 'text-amber-600'}`}>
              {checklistPassed}/{checklistTotal} items checked
            </span>
          </div>
        )}

        {fuelLevel !== undefined && (
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-slate-500">Fuel level {mode === 'checkout' ? '(out)' : '(in)'}</span>
            <span className="font-medium text-slate-900">{fuelLevel}%</span>
          </div>
        )}

        {photoCount !== undefined && (
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-slate-500">Photos</span>
            <span className="font-medium text-slate-900">{photoCount} uploaded</span>
          </div>
        )}

        {mode === 'checkout' && (
          <div className="px-4 py-3 flex justify-between text-sm">
            <span className="text-slate-500">Damage</span>
            <span className={`font-medium ${damageNoted ? 'text-red-600' : 'text-green-600'}`}>
              {damageNoted ? 'Noted' : 'None'}
            </span>
          </div>
        )}

        {damageNoted && damageDescription && (
          <div className="px-4 py-3 text-sm">
            <p className="text-slate-500 mb-1">Damage description</p>
            <p className="text-slate-700">{damageDescription}</p>
          </div>
        )}
      </div>

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full min-h-12 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40 transition-colors"
      >
        {loading
          ? 'Saving…'
          : mode === 'checkin'
          ? 'Confirm Check-in'
          : 'Confirm Check-out'}
      </button>
    </div>
  )
}
