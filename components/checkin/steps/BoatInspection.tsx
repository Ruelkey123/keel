'use client'

const CHECKLIST_ITEMS = [
  { key: 'life_jackets', label: 'Life jackets present' },
  { key: 'fire_extinguisher', label: 'Fire extinguisher present' },
  { key: 'nav_lights', label: 'Navigation lights working' },
  { key: 'bilge_pump', label: 'Bilge pump working' },
  { key: 'engine_starts', label: 'Engine starts normally' },
  { key: 'no_damage', label: 'No visible damage' },
]

interface BoatInspectionProps {
  checklist: Record<string, boolean>
  onChange: (checklist: Record<string, boolean>) => void
}

export function BoatInspection({ checklist, onChange }: BoatInspectionProps) {
  function toggle(key: string) {
    onChange({ ...checklist, [key]: !checklist[key] })
  }

  const allChecked = CHECKLIST_ITEMS.every((item) => checklist[item.key])

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Verify each item before starting the rental.
      </p>

      <div className="space-y-2">
        {CHECKLIST_ITEMS.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <input
              type="checkbox"
              checked={!!checklist[key]}
              onChange={() => toggle(key)}
              className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span className="text-sm font-medium text-slate-800">{label}</span>
          </label>
        ))}
      </div>

      {allChecked && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-sm font-medium text-green-700">All items verified — ready to proceed.</p>
        </div>
      )}
    </div>
  )
}
