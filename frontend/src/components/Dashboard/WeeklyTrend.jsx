import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useStore } from '../../store/useStore'

const COLORS = ['#4f8ef7', '#10d98c', '#f5a623', '#f04060', '#a78bfa']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--muted)', marginBottom: 6 }}>Week {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value.toFixed(1)}h</p>
      ))}
    </div>
  )
}

export default function WeeklyTrend() {
  const { metrics, filters } = useStore()
  if (!metrics) return null

  const { weekly_trend } = metrics
  const chartData = [1, 2, 3, 4].map((w, i) => {
    const point = { week: w }
    weekly_trend.series.forEach((s) => { point[s.task] = s.values[i] })
    return point
  })

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={headingStyle}>Week-over-Week Trend</h3>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Top 5 task categories · Oct 2025</span>
      </div>
      {filters.department && (
        <p style={{ fontSize: 11, color: 'var(--amber)', marginBottom: 8 }}>ℹ Trend shows full dataset (not dept-filtered)</p>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
          <XAxis dataKey="week" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(v) => `Wk ${v}`} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          {weekly_trend.series.map((s, i) => (
            <Line key={s.task} type="monotone" dataKey={s.task} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3, fill: COLORS[i] }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }
const headingStyle = { fontSize: 14, fontWeight: 600, color: 'var(--text)' }
