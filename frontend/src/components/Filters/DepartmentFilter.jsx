import React from 'react'
import { useStore } from '../../store/useStore'

export default function DepartmentFilter() {
  const { metrics, filters, setFilter, theme } = useStore()
  const depts = metrics?.by_department?.map(d => d.name) || []

  const pillStyle = {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--muted)',
    borderRadius: 5,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: 12,
    width: '100%',
  }
  const pillActive = {
    background: theme === 'light' ? 'rgba(0,123,255,0.1)' : 'rgba(79,142,247,0.15)',
    borderColor: theme === 'light' ? '#007bff' : '#4f8ef7',
    color: theme === 'light' ? '#007bff' : '#4f8ef7',
  }

  return (
    <div>
      <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Department</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={() => setFilter('department', null)}
          style={{ ...pillStyle, ...(filters.department === null ? pillActive : {}) }}>
          All Departments
        </button>
        {depts.map(d => (
          <button key={d} onClick={() => setFilter('department', d)}
            style={{ ...pillStyle, ...(filters.department === d ? pillActive : {}), textAlign: 'left' }}>
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}