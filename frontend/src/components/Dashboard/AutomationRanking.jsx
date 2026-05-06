import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useFilteredData } from '../../hooks/useFilteredData'

const fmtINR = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`
}

const scoreColor = (score) => {
  if (score >= 15) return '#f04060'
  if (score >= 10) return '#f5a623'
  return '#4f8ef7'
}

export default function AutomationRanking() {
  const { metrics } = useStore()
  const { setFilter, filters } = useStore()
  const [showTooltip, setShowTooltip] = useState(false)

  const ranking = metrics?.automation_ranking?.slice(0, 10) || []

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={headingStyle}>Automation Priority Ranking</h3>
        <div style={{ position: 'relative' }}>
          <button onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}
            style={{ background: 'var(--border)', border: 'none', color: 'var(--muted)', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
            Score formula ℹ
          </button>
          {showTooltip && (
            <div style={{ position: 'absolute', right: 0, top: 32, width: 280, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 11, color: 'var(--muted)', zIndex: 100, lineHeight: 1.8 }}>
              <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 6 }}>Automation Score Formula</strong>
              score = (<br/>
              &nbsp;&nbsp;volume_pct × <strong style={{ color: '#4f8ef7' }}>0.35</strong> +<br/>
              &nbsp;&nbsp;repetitive_rate × <strong style={{ color: '#10d98c' }}>0.30</strong> +<br/>
              &nbsp;&nbsp;employee_concentration × <strong style={{ color: '#f5a623' }}>0.20</strong> +<br/>
              &nbsp;&nbsp;cost_pct × <strong style={{ color: '#f04060' }}>0.15</strong><br/>
              ) × 100
            </div>
          )}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['#', 'Task Category', 'Score', 'Hours', '₹/mo', 'Employees', 'Rep%'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: h === '#' || h === 'Score' || h === 'Hours' || h === '₹/mo' || h === 'Employees' || h === 'Rep%' ? 'right' : 'left', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.map((task, i) => {
              const isActive = filters.taskCategory === task.name
              return (
                <tr key={task.name}
                  onClick={() => setFilter('taskCategory', task.name)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent', transition: 'background 0.15s' }}>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: '8px', color: isActive ? '#a78bfa' : 'var(--text)', fontWeight: isActive ? 600 : 400 }}>
                    {task.name}
                    {isActive && <span style={{ marginLeft: 6, fontSize: 10, color: '#a78bfa' }}>● active filter</span>}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <span style={{ background: `${scoreColor(task.automation_score)}20`, color: scoreColor(task.automation_score), padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {task.automation_score.toFixed(1)}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{task.total_hours.toFixed(1)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#10d98c' }}>{fmtINR(task.cost_per_month)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: 'var(--muted)' }}>{task.employee_count}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <span style={{ color: task.rep_pct > 60 ? '#f04060' : task.rep_pct > 40 ? '#f5a623' : 'var(--muted)' }}>
                      {task.rep_pct.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>Click a row to filter the employee list below</p>
    </div>
  )
}

const cardStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }
const headingStyle = { fontSize: 14, fontWeight: 600, color: 'var(--text)' }
