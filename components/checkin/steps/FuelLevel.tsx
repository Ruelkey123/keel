'use client'

interface FuelLevelProps {
  value: number
  onChange: (value: number) => void
  label?: string
}

function fuelColor(level: number) {
  if (level <= 25) return 'bg-red-500'
  if (level <= 50) return 'bg-amber-500'
  return 'bg-green-500'
}

export function FuelLevel({ value, onChange, label = 'Fuel level' }: FuelLevelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Record the current fuel level on the gauge.</p>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className="text-xl font-bold text-slate-900">{value}%</span>
        </div>

        {/* Progress bar gauge */}
        <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-200 ${fuelColor(value)}`}
            style={{ width: `${value}%` }}
          />
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs text-slate-400">
          <span>Empty</span>
          <span>¼</span>
          <span>½</span>
          <span>¾</span>
          <span>Full</span>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 accent-sky-600 cursor-pointer"
        />
      </div>
    </div>
  )
}
