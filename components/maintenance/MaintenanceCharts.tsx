'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

export interface MaintenanceChartsProps {
  statusData: { name: string; value: number; color: string }[]
  costByType: { name: string; value: number; color: string }[]
  monthlySpend: { month: string; cost: number }[]
  costByBoat: { name: string; cost: number }[]
}

function dollarTick(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
  return `$${value}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dollarTooltipFormatter = (value: any) => `$${Number(value).toLocaleString()}` as any

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-4 flex flex-col h-64">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

function StatusPie({ data }: { data: MaintenanceChartsProps['statusData'] }) {
  const hasData = data.some((d) => d.value > 0)
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-slate-400">
        No data yet
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          outerRadius={60}
          dataKey="value"
          label={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function CostByTypePie({ data }: { data: MaintenanceChartsProps['costByType'] }) {
  const hasData = data.some((d) => d.value > 0)
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-slate-400">
        No data yet
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          outerRadius={60}
          dataKey="value"
          label={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={dollarTooltipFormatter} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function MonthlySpendBar({ data }: { data: MaintenanceChartsProps['monthlySpend'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={dollarTick}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip formatter={dollarTooltipFormatter} />
        <Bar dataKey="cost" fill="#0f172a" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function CostPerBoatBar({ data }: { data: MaintenanceChartsProps['costByBoat'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis
          type="number"
          tickFormatter={dollarTick}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip formatter={dollarTooltipFormatter} />
        <Bar dataKey="cost" fill="#0369a1" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MaintenanceCharts({
  statusData,
  costByType,
  monthlySpend,
  costByBoat,
}: MaintenanceChartsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ChartCard title="Jobs by Status">
        <StatusPie data={statusData} />
      </ChartCard>

      <ChartCard title="Cost by Type">
        <CostByTypePie data={costByType} />
      </ChartCard>

      <ChartCard title="Monthly Maintenance Spend">
        <MonthlySpendBar data={monthlySpend} />
      </ChartCard>

      <ChartCard title="Spend by Boat">
        <CostPerBoatBar data={costByBoat} />
      </ChartCard>
    </div>
  )
}
