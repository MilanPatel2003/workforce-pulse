import React, { useState } from 'react'
import { useStore } from '../../store/useStore'

const severityColor = { high: '#f04060', medium: '#f5a623', low: '#4f8ef7' }

export default function AnomalyCallout() {
  const { metrics } = useStore()
  const [expanded, setExpanded] = useState(true)
  const anomalies = metrics?.anomalies || []

  if (!anomalies.length) return null

  const primary = anomalies[0]

  return (
    <div style={{ ...cardStyle, borderColor: severityColor[primary.severity] || '#f5a623' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
          <span style={{ fontSize: 18 }}>
            {primary.severity === 'high' ? '🔴' : primary.severity === 'medium' ? '⚠️' : 'ℹ️'}
          </span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: severityColor[primary.severity], marginBottom: 2 }}>
              Anomaly Detected — {primary.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text)' }}>{primary.description}</p>
            {expanded && primary.recommendation && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                <strong style={{ color: 'var(--text)' }}>Recommended: </strong>{primary.recommendation}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{anomalies.length} total</span>
          <button onClick={() => setExpanded(!expanded)}
            style={{ background: 'var(--border)', border: 'none', color: 'var(--muted)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>
            {expanded ? 'Hide' : 'All'}
          </button>
        </div>
      </div>

      {expanded && anomalies.length > 1 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {anomalies.slice(1).map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12 }}>{a.severity === 'high' ? '🔴' : a.severity === 'medium' ? '⚠️' : 'ℹ️'}</span>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text)' }}>{a.description}</p>
                {a.recommendation && <p style={{ fontSize: 11, color: 'var(--muted)' }}>{a.recommendation}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const cardStyle = {
  background: 'rgba(240,64,96,0.05)',
  border: '1px solid',
  borderRadius: 8,
  padding: 16,
}
