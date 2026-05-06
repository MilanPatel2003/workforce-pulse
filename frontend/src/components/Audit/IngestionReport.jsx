import React, { useState } from 'react'
import { useStore } from '../../store/useStore'

export default function IngestionReport() {
  const { data } = useStore()
  const [open, setOpen] = useState(false)
  const audit = data?.audit
  if (!audit) return null

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'var(--text)' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>📋 Data Ingestion Report</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{open ? '▲ hide' : '▼ show'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', fontSize: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Raw rows', value: audit.rows_raw, color: 'var(--text)' },
              { label: 'Dropped', value: audit.rows_dropped, color: '#f04060' },
              { label: 'Duration capped', value: audit.rows_capped, color: '#f5a623' },
              { label: 'Valid rows', value: audit.rows_valid, color: '#10d98c' },
              { label: 'Employees (HRMS)', value: audit.employees_in_json, color: 'var(--text)' },
              { label: 'Employees (activity)', value: audit.employees_in_csv, color: 'var(--text)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px' }}>
                <p style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 2 }}>{label}</p>
                <p style={{ color, fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700 }}>{value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Section title="Drop reasons">
              {Object.entries(audit.drop_reasons || {}).map(([k, v]) => (
                <Row key={k} label={k.replace(/_/g, ' ')} value={`${v} rows`} color="#f04060" />
              ))}
            </Section>

            <Section title="Join anomalies">
              <Row label="Ghost employees (no metadata)" value={audit.ghost_employees?.join(', ') || 'none'} color="#f5a623" />
              <Row label="No-activity employees" value={audit.no_activity_employees?.join(', ') || 'none'} color="#f5a623" />
              <Row label="Terminated employees" value={audit.terminated_employees?.join(', ') || 'none'} color="#f04060" />
              {audit.duplicate_resolved?.map(d => (
                <Row key={d.id} label={`${d.id} duplicate resolved`} value={`Kept: ${d.kept}`} color="#4f8ef7" />
              ))}
            </Section>
          </div>
        </div>
      )}
    </div>
  )
}

const Section = ({ title, children }) => (
  <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: 12 }}>
    <p style={{ color: 'var(--muted)', fontSize: 10, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
    {children}
  </div>
)

const Row = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ color: 'var(--muted)' }}>{label}</span>
    <span style={{ color: color || 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{value}</span>
  </div>
)
