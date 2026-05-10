import React, { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useStore } from '../../store/useStore'
import { useFilteredData } from '../../hooks/useFilteredData'

const fmtINR = (n) => n ? `₹${new Intl.NumberFormat('en-IN').format(Math.round(n * 2376))}` : '—'

export default function EmployeeDrilldown() {
  const { metrics, filters } = useStore()
  const { filteredRows } = useFilteredData()
  const [selected, setSelected] = useState(null)

  const employees = useMemo(() => {
    if (!metrics) return []
    let emps = metrics.per_employee
    if (filters.department) emps = emps.filter(e => e.dept === filters.department)
    if (filters.taskCategory) {
      const activeIds = new Set(filteredRows.filter(r => r.task_category === filters.taskCategory).map(r => r.employee_id))
      emps = emps.filter(e => activeIds.has(e.id))
    }
    return emps
  }, [metrics, filters, filteredRows])

  const emp = selected ? employees.find(e => e.id === selected) : null
  const roleAvg = emp ? (metrics?.role_avg_rep_pct?.[emp.role] || 0) : 0

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={headingStyle}>Employee Drilldown</h3>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{employees.length} employee{employees.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 16 }}>
        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Dept', 'Role', 'Hours', 'Rep%', 'Top Task', 'Status'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} onClick={() => setSelected(selected === e.id ? null : e.id)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected === e.id ? 'rgba(79,142,247,0.08)' : 'transparent' }}>
                  <td style={{ padding: '8px', color: 'var(--text)', fontWeight: 500 }}>
                    {e.name}
                    {e.metadata_missing && <span title="No HRMS metadata" style={{ marginLeft: 6, color: '#f5a623', fontSize: 10 }}>⚠ No meta</span>}
                  </td>
                  <td style={{ padding: '8px', color: 'var(--muted)' }}>{e.dept}</td>
                  <td style={{ padding: '8px', color: 'var(--muted)', fontSize: 11 }}>{e.role}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{e.total_hours.toFixed(1)}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ color: e.rep_pct > 60 ? '#f04060' : e.rep_pct > 40 ? '#f5a623' : '#10d98c', fontFamily: 'var(--font-mono)' }}>
                      {e.rep_pct.toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ padding: '8px', color: 'var(--muted)', fontSize: 11 }}>{e.top_tasks[0]?.name || '—'}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 10,
                      background: e.status === 'terminated' ? 'rgba(240,64,96,0.15)' : 'rgba(16,217,140,0.1)',
                      color: e.status === 'terminated' ? '#f04060' : '#10d98c'
                    }}>
                      {e.status === 'terminated' ? '● Terminated' : '● Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {emp && (
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{emp.name}</p>
                <p style={{ color: 'var(--muted)', fontSize: 11 }}>{emp.role} · {emp.dept}</p>
                {emp.annual_ctc && <p style={{ color: 'var(--muted)', fontSize: 11 }}>{fmtINR(emp.hourly_rate)}/hr</p>}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>

            {/* vs role avg */}
            <div style={{ marginBottom: 12 }}>
              <p style={{ color: 'var(--muted)', marginBottom: 6, fontSize: 11 }}>Repetitive % vs Role Avg</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ width: `${Math.min(emp.rep_pct, 100)}%`, height: '100%', background: emp.rep_pct > roleAvg + 10 ? '#f04060' : '#4f8ef7', borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: 11 }}>{emp.rep_pct.toFixed(0)}%</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 10, marginTop: 2 }}>Role avg: {roleAvg.toFixed(0)}%</p>
            </div>

            {/* Top REPETITIVE tasks */}
            <p style={{ color: 'var(--muted)', marginBottom: 6, fontSize: 11 }}>Top Repetitive Tasks</p>
            {emp.top_rep_tasks?.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={emp.top_rep_tasks} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <Bar dataKey="rep_hours" fill="#f04060" radius={[0, 3, 3, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>No repetitive tasks logged</p>
            )}

            {/* Weekly trend */}
            <p style={{ color: 'var(--muted)', marginTop: 8, marginBottom: 6, fontSize: 11 }}>Weekly Activity</p>
            <ResponsiveContainer width="100%" height={70}>
              <LineChart data={emp.weekly_trend} margin={{ left: -20, right: 5 }}>
                <XAxis dataKey="week" tickFormatter={v => `W${v}`} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Line type="monotone" dataKey="total" stroke="#4f8ef7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rep" stroke="#10d98c" strokeWidth={1} strokeDasharray="4 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }
const headingStyle = { fontSize: 14, fontWeight: 600, color: 'var(--text)' }