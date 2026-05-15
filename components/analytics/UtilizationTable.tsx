'use client'

import { useState } from 'react'

interface UtilizationRow {
  name: string
  hoursBooked: number
  utilizationRate: number
}

interface UtilizationTableProps {
  data: UtilizationRow[]
}

type SortKey = 'name' | 'hoursBooked' | 'utilizationRate'

export function UtilizationTable({ data }: UtilizationTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('utilizationRate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir === 'asc'
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number)
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-slate-300">↕</span>
    return (
      <span className="ml-1 text-slate-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
    )
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">No utilization data available.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {(
              [
                { key: 'name', label: 'Boat' },
                { key: 'hoursBooked', label: 'Hours booked' },
                { key: 'utilizationRate', label: 'Utilization' },
              ] as { key: SortKey; label: string }[]
            ).map(({ key, label }) => (
              <th
                key={key}
                className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                onClick={() => handleSort(key)}
              >
                {label}
                <SortIcon col={key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sorted.map((row) => (
            <tr key={row.name} className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 px-3 font-medium text-slate-900">{row.name}</td>
              <td className="py-2.5 px-3 text-slate-600">{row.hoursBooked}h</td>
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden min-w-[80px]">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all"
                      style={{ width: `${Math.min(100, row.utilizationRate)}%` }}
                    />
                  </div>
                  <span className="text-slate-700 text-xs font-medium w-10 text-right">
                    {row.utilizationRate.toFixed(1)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
