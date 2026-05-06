import React, { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useStore } from '../../store/useStore'
import { useFilteredData } from '../../hooks/useFilteredData'

const tabs = ['By Task', 'By App', 'By Department']

function computeBreakdown(rows, tab) {
  const map = {}
  for (const r of rows) {
    const key = tab === 'By Task' ? r.task_category
      : tab === 'By App' ? r.app_used
      : (r.department || r.employee?.department || 'Unknown')
    if (!map[key]) map[key] = { name: key, total: 0, rep: 0 }
    map[key].total += r.duration_minutes
    if (r.is_repetitive === true) map[key].rep += r.duration_minutes
  }
  return Object.values(map)
    .map(d => ({ ...d, total_hours: +(d.total / 60).toFixed(1), rep_hours: +(d.rep / 60).toFixed(1), rep_pct: d.total > 0 ? +((d.rep / d.total) * 100).toFixed(0) : 0 }))
    .sort((a, b) => b.total_hours - a.total_hours)
    .slice(0, 12)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--text)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      <p style={{ color: '#4f8ef7' }}>Total: {payload[0]?.value} hrs</p>
      <p style={{ color: '#10d98c' }}>Repetitive: {payload[1]?.value} hrs</p>
      <p style={{ color: 'var(--muted)' }}>Rep rate: {payload[0]?.payload?.rep_pct}%</p>
    </div>
  )
}

export default function TimeSinkBreakdown() {
  const [activeTab, setActiveTab] = useState(0)
  const { filteredRows } = useFilteredData()
  const { setFilter, filters } = useStore()

  const data = useMemo(() => computeBreakdown(filteredRows, tabs[activeTab]), [filteredRows, activeTab])

  const handleBarClick = (entry) => {
    if (activeTab === 2) setFilter('department', entry.name)
    else if (activeTab === 0) setFilter('taskCategory', entry.name)
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={headingStyle}>Time Sink Breakdown</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)}
              style={{ ...tabBtn, ...(activeTab === i ? tabActive : {}) }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>No data for current filter</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(data.length * 34, 200)}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }} onClick={(e) => e?.activePayload && handleBarClick(e.activePayload[0].payload)}>
            <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" width={130} tick={{ fill: 'var(--text)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="total_hours" fill="#4f8ef7" radius={[0, 3, 3, 0]} barSize={14} style={{ cursor: activeTab !== 1 ? 'pointer' : 'default' }}>
              {data.map((entry, i) => (
                <Cell key={i} fill={
                  (activeTab === 2 && filters.department === entry.name) ||
                  (activeTab === 0 && filters.taskCategory === entry.name)
                    ? '#7c3aed' : '#4f8ef7'
                } />
              ))}
            </Bar>
            <Bar dataKey="rep_hours" fill="#10d98c" radius={[0, 3, 3, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      )}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#4f8ef7', borderRadius: 2, marginRight: 4 }} />Total hours</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#10d98c', borderRadius: 2, marginRight: 4 }} />Repetitive hours</span>
        {activeTab !== 1 && <span style={{ color: 'var(--muted)' }}>Click bar to filter</span>}
      </div>
    </div>
  )
}

const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }
const headingStyle = { fontSize: 14, fontWeight: 600, color: 'var(--text)' }
const tabBtn = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }
const tabActive = { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
