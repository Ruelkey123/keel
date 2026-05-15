'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface StatusPieChartProps {
  data: { status: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#0ea5e9',
  checked_out: '#8b5cf6',
  completed: '#10b981',
  canceled: '#ef4444',
}

const DEFAULT_COLORS = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#64748b',
]

function getColor(status: string, idx: number) {
  return STATUS_COLORS[status] ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')
}

export function StatusPieChart({ data }: StatusPieChartProps) {
  const chartData = data.map((d) => ({
    name: capitalize(d.status),
    value: d.count,
    status: d.status,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, idx) => (
            <Cell key={entry.status} fill={getColor(entry.status, idx)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [value, name]}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '12px',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: '12px', color: '#475569' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
