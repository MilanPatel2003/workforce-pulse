import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
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

  const { weekly_trend, dept_weekly_series, all_weeks } = metrics
  const dept = filters.department

  // Dept filter active — show that dept's total vs rep per week as bars
  if (dept && dept_weekly_series?.[dept]) {
    const deptData = dept_weekly_series[dept]
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={headingStyle}>Week-over-Week Trend</h3>
          <span style={{ fontSize: 11, color: '#f5a623', background: 'rgba(245,166,35,0.1)', padding: '3px 8px', borderRadius: 4 }}>
            {dept} only
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={deptData} margin={{ left: -10, right: 10 }}>
            <XAxis dataKey="week" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={v => `Wk ${v}`} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                  <p style={{ color: 'var(--muted)', marginBottom: 4 }}>Week {label}</p>
                  <p style={{ color: '#4f8ef7' }}>Total: {payload[0]?.value?.toFixed(1)}h</p>
                  <p style={{ color: '#10d98c' }}>Repetitive: {payload[1]?.value?.toFixed(1)}h</p>
                </div>
              )
            }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="total_hours" name="Total hours" fill="#4f8ef7" radius={[3, 3, 0, 0]} barSize={20} />
            <Bar dataKey="rep_hours" name="Repetitive hours" fill="#10d98c" radius={[3, 3, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // No filter — top 5 tasks as lines
  const chartData = (all_weeks || [1, 2, 3, 4]).map((w, i) => {
    const point = { week: w }
    weekly_trend.series.forEach((s) => { point[s.task] = s.values[i] })
    return point
  })

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={headingStyle}>Week-over-Week Trend</h3>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Top 5 tasks · Oct–Nov 2025</span>
      </div>
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