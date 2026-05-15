'use client'

interface DamageNotesProps {
  damageNoted: boolean
  damageDescription: string
  onDamageNotedChange: (value: boolean) => void
  onDamageDescriptionChange: (value: string) => void
}

export function DamageNotes({
  damageNoted,
  damageDescription,
  onDamageNotedChange,
  onDamageDescriptionChange,
}: DamageNotesProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Note any damage or issues discovered during check-out.
      </p>

      {/* Damage toggle */}
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 cursor-pointer hover:bg-slate-50 transition-colors">
        <input
          type="checkbox"
          checked={damageNoted}
          onChange={(e) => onDamageNotedChange(e.target.checked)}
          className="h-5 w-5 rounded border-slate-300 text-red-500 focus:ring-red-400"
        />
        <div>
          <p className="text-sm font-medium text-slate-800">Damage noticed</p>
          <p className="text-xs text-slate-500 mt-0.5">Check if any new damage was found</p>
        </div>
      </label>

      {damageNoted && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="damage-desc">
            Describe the damage
          </label>
          <textarea
            id="damage-desc"
            value={damageDescription}
            onChange={(e) => onDamageDescriptionChange(e.target.value)}
            placeholder="Describe location and extent of damage…"
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>
      )}

      {!damageNoted && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">No damage — check the box above if you notice any issues.</p>
        </div>
      )}
    </div>
  )
}
