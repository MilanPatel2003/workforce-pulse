import React, { useState } from 'react'
import { useFilteredData } from '../../hooks/useFilteredData'
import { useStore } from '../../store/useStore'

const fmt = (n) => new Intl.NumberFormat('en-IN').format(Math.round(n))
const fmtL = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  return `₹${fmt(n)}`
}

export default function HeadlineNumbers() {
  const { filteredMetrics } = useFilteredData()
  const { filters } = useStore()
  const [showMethod, setShowMethod] = useState(false)
  const h = filteredMetrics?.headline
  if (!h) return null
  const isFiltered = filters.department || filters.taskCategory

  return (
    <div className="headline-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Hours card */}
      <div style={cardStyle('#10d98c')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Recoverable / Month
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 38, fontWeight: 700, color: '#10d98c', lineHeight: 1 }}>
              {h.recoverable_hours_per_month.toFixed(1)}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>hours per month</p>
          </div>
          <div style={badgeStyle}>
            <span style={{ fontSize: 11, color: '#10d98c' }}>
              {h.repetitive_pct.toFixed(0)}% of {h.total_hours.toFixed(0)}h logged
            </span>
          </div>
        </div>
        <div style={{ marginTop: 12, height: 4, background: 'var(--border)', borderRadius: 2 }}>
          <div style={{ width: `${Math.min(h.repetitive_pct, 100)}%`, height: '100%', background: '#10d98c', borderRadius: 2 }} />
        </div>
        <p style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
          {h.repetitive_hours.toFixed(1)}h repetitive × 70% automation factor
        </p>
      </div>

      {/* INR card */}
      <div style={cardStyle('#4f8ef7')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Cost Recoverable / Month
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 38, fontWeight: 700, color: '#4f8ef7', lineHeight: 1 }}>
              {fmtL(h.recoverable_inr_per_month)}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>INR per month</p>
          </div>
          <button
            onClick={() => setShowMethod(!showMethod)}
            style={{ background: 'var(--border)', border: 'none', color: 'var(--muted)', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
          >
            {showMethod ? 'Hide' : '?'} method
          </button>
        </div>
        {isFiltered && (
          <p style={{ marginTop: 8, fontSize: 11, color: 'var(--amber)', background: 'rgba(245,166,35,0.1)', padding: '4px 8px', borderRadius: 4 }}>
            ⚡ Filtered: {[filters.department, filters.taskCategory].filter(Boolean).join(' + ')}
          </p>
        )}
        {showMethod && (
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(79,142,247,0.08)', borderRadius: 6, fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Methodology</strong>
            {h.methodology}
          </div>
        )}
      </div>
    </div>
  )
}

const cardStyle = (color) => ({
  background: 'var(--surface)',
  border: `1px solid var(--border)`,
  borderTop: `3px solid ${color}`,
  borderRadius: 8,
  padding: 20,
})

const badgeStyle = {
  background: 'rgba(16,217,140,0.1)',
  border: '1px solid rgba(16,217,140,0.2)',
  borderRadius: 20,
  padding: '4px 10px',
}
