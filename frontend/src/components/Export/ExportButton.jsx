import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useFilteredData } from '../../hooks/useFilteredData'

const fmtL = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`
}

export default function ExportButton() {
  const { filters, metrics } = useStore()
  const { filteredMetrics } = useFilteredData()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')

      const el = document.getElementById('export-capture')
      if (!el) { alert('Export element not found'); return }

      el.style.display = 'block'
      await new Promise(r => setTimeout(r, 200))

      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#080b12', useCORS: true })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, w, Math.min(h, 297))
      pdf.save(`workforce-pulse-${new Date().toISOString().split('T')[0]}.pdf`)

      el.style.display = 'none'
    } catch (e) {
      console.error('Export failed', e)
      alert('Export failed. See console.')
    } finally {
      setExporting(false)
    }
  }

  const h = filteredMetrics?.headline
  const top5 = metrics?.automation_ranking?.slice(0, 5) || []
  const activeFilters = [filters.department, filters.taskCategory].filter(Boolean)

  return (
    <>
      <button onClick={handleExport} disabled={exporting}
        style={{ background: exporting ? 'var(--border)' : 'var(--accent2)', border: 'none', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: exporting ? 'default' : 'pointer', fontSize: 12, fontWeight: 500 }}>
        {exporting ? '⏳ Exporting…' : '↓ Export PDF'}
      </button>

      {/* Hidden export capture div */}
      <div id="export-capture" style={{ display: 'none', position: 'fixed', left: -9999, top: 0, width: 794, background: 'var(--bg)', padding: 40, fontFamily: "'DM Sans', sans-serif", color: 'var(--text)' }}>
        <div style={{ borderBottom: '2px solid var(--accent)', paddingBottom: 16, marginBottom: 24 }}>
          <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>WORKFORCE PULSE</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Executive Summary · Generated {new Date().toLocaleDateString('en-IN')} · {metrics?.dateRange?.start} – {metrics?.dateRange?.end}</p>
          {activeFilters.length > 0 && <p style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4 }}>Filters active: {activeFilters.join(' + ')}</p>}
        </div>

        {h && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--green)', borderRadius: 8, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>RECOVERABLE HOURS / MONTH</p>
              <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 36, color: 'var(--green)', fontWeight: 700 }}>{h.recoverable_hours_per_month.toFixed(1)}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{h.repetitive_hours.toFixed(1)}h repetitive × 70% automation factor</p>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: 8, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>COST RECOVERABLE / MONTH</p>
              <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 36, color: 'var(--accent)', fontWeight: 700 }}>{fmtL(h.recoverable_inr_per_month)}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Based on employee CTC data</p>
            </div>
          </div>
        )}

        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>Top 5 Automation Opportunities</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['#', 'Task Category', 'Score', 'Hours/mo', '₹/mo', 'Employees', 'Rep%'].map(c => (
                <th key={c} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--muted)', fontWeight: 500 }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top5.map((t, i) => (
              <tr key={t.name} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px', color: 'var(--muted)', fontFamily: 'Space Mono, monospace' }}>{i + 1}</td>
                <td style={{ padding: '8px', color: 'var(--text)', fontWeight: 500 }}>{t.name}</td>
                <td style={{ padding: '8px', color: 'var(--amber)', fontFamily: 'Space Mono, monospace' }}>{t.automation_score.toFixed(1)}</td>
                <td style={{ padding: '8px', fontFamily: 'Space Mono, monospace' }}>{t.total_hours.toFixed(1)}</td>
                <td style={{ padding: '8px', color: 'var(--green)', fontFamily: 'Space Mono, monospace' }}>{fmtL(t.cost_per_month)}</td>
                <td style={{ padding: '8px', color: 'var(--muted)' }}>{t.employee_count}</td>
                <td style={{ padding: '8px', color: t.rep_pct > 60 ? 'var(--red)' : 'var(--amber)' }}>{t.rep_pct.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          Methodology: Recoverable = Repetitive hours × 70% automation factor ÷ 4 wks × 4.33 avg/mo. Score = volume(0.35) + rep_rate(0.30) + concentration(0.20) + cost(0.15). Data: Oct 2025, {metrics?.audit?.rows_valid} valid rows.
        </p>
      </div>
    </>
  )
}
