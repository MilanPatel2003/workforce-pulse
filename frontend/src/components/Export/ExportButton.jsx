import React, { useState } from 'react'
import { useStore } from '../../store/useStore'
import { useFilteredData } from '../../hooks/useFilteredData'

const fmtL = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  return `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`
}

const AUTOMATION_FACTOR = 0.70
const AVG_WEEKS_PER_MONTH = 4.33
const WEEKS_IN_DATASET = 4

export default function ExportButton() {
  const { filters, metrics } = useStore()
  const { filteredMetrics, filteredRows } = useFilteredData()
  const [exporting, setExporting] = useState(false)

  // Recompute top-5 from filtered rows so export reflects current filter state
  const filteredTop5 = React.useMemo(() => {
    if (!filters.department || !filteredRows.length) {
      return metrics?.automation_ranking?.slice(0, 5) || []
    }
    const taskMap = {}
    const totalAllMins = filteredRows.reduce((s, r) => s + r.duration_minutes, 0)
    const totalEmp = new Set(filteredRows.map(r => r.employee_id)).size
    for (const r of filteredRows) {
      const t = r.task_category
      if (!taskMap[t]) taskMap[t] = { name: t, total: 0, rep: 0, rep_cost: 0, employees: new Set() }
      taskMap[t].total += r.duration_minutes
      taskMap[t].employees.add(r.employee_id)
      if (r.is_repetitive === true) {
        taskMap[t].rep += r.duration_minutes
        taskMap[t].rep_cost += (r.duration_minutes / 60) * (r.employee?.hourly_rate_inr || 0)
      }
    }
    const maxCost = Math.max(...Object.values(taskMap).map(t => t.rep_cost)) || 1
    return Object.values(taskMap).map(t => {
      const repRate = t.total > 0 ? t.rep / t.total : 0
      const score = (
        (t.total / (totalAllMins || 1)) * 0.35 +
        repRate * 0.30 +
        (t.employees.size / Math.max(totalEmp, 1)) * 0.20 +
        (t.rep_cost / maxCost) * 0.15
      ) * 100
      return {
        name: t.name,
        total_hours: +(t.total / 60).toFixed(2),
        rep_pct: +(repRate * 100).toFixed(1),
        cost_per_month: +((t.rep_cost * AUTOMATION_FACTOR) / WEEKS_IN_DATASET * AVG_WEEKS_PER_MONTH).toFixed(0),
        employee_count: t.employees.size,
        automation_score: +score.toFixed(1),
      }
    }).sort((a, b) => b.automation_score - a.automation_score).slice(0, 5)
  }, [filteredRows, filters.department, metrics])

  const handleExport = async () => {
    setExporting(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')

      const el = document.getElementById('export-capture')
      if (!el) { alert('Export element not found'); return }

      el.style.display = 'block'
      await new Promise(r => setTimeout(r, 300))

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
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
  const activeFilters = [filters.department, filters.taskCategory].filter(Boolean)

  return (
    <>
      <button onClick={handleExport} disabled={exporting}
        style={{ background: exporting ? 'var(--border)' : 'var(--accent2)', border: 'none', color: '#fff', borderRadius: 6, padding: '7px 14px', cursor: exporting ? 'default' : 'pointer', fontSize: 12, fontWeight: 500 }}>
        {exporting ? '⏳ Exporting…' : '↓ Export PDF'}
      </button>

      {/* Hidden export capture — white background for printing */}
      <div id="export-capture" style={{
        display: 'none', position: 'fixed', left: -9999, top: 0,
        width: 794, background: '#ffffff', padding: 40,
        fontFamily: "'DM Sans', sans-serif", color: '#0f1520',
      }}>
        {/* Header */}
        <div style={{ borderBottom: '3px solid #4f8ef7', paddingBottom: 16, marginBottom: 24 }}>
          <p style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: '#4f8ef7' }}>WORKFORCE PULSE</p>
          <p style={{ fontSize: 13, color: '#6b7fa3', marginTop: 4 }}>
            Executive Summary · {new Date().toLocaleDateString('en-IN')} · {metrics?.dateRange?.start} – {metrics?.dateRange?.end}
          </p>
          {activeFilters.length > 0 && (
            <p style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>Filters active: {activeFilters.join(' + ')}</p>
          )}
        </div>

        {/* Headline numbers */}
        {h && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderTop: '3px solid #10b981', borderRadius: 8, padding: 16 }}>
              <p style={{ fontSize: 11, color: '#6b7fa3', marginBottom: 4 }}>RECOVERABLE HOURS / MONTH</p>
              <p style={{ fontFamily: 'monospace', fontSize: 36, color: '#059669', fontWeight: 700 }}>{h.recoverable_hours_per_month.toFixed(1)}</p>
              <p style={{ fontSize: 11, color: '#6b7fa3', marginTop: 4 }}>{h.repetitive_hours.toFixed(1)}h repetitive × 70% automation factor</p>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderTop: '3px solid #4f8ef7', borderRadius: 8, padding: 16 }}>
              <p style={{ fontSize: 11, color: '#6b7fa3', marginBottom: 4 }}>COST RECOVERABLE / MONTH</p>
              <p style={{ fontFamily: 'monospace', fontSize: 36, color: '#2563eb', fontWeight: 700 }}>{fmtL(h.recoverable_inr_per_month)}</p>
              <p style={{ fontSize: 11, color: '#6b7fa3', marginTop: 4 }}>Based on employee CTC data</p>
            </div>
          </div>
        )}

        {/* Top 5 automation opportunities — FILTERED */}
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#0f1520' }}>
          Top 5 Automation Opportunities
          {filters.department && <span style={{ fontSize: 11, fontWeight: 400, color: '#d97706', marginLeft: 8 }}>({filters.department} department)</span>}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              {['#', 'Task Category', 'Score', 'Hours', '₹/mo', 'Employees', 'Rep%'].map(c => (
                <th key={c} style={{ padding: '8px', textAlign: c === 'Task Category' ? 'left' : 'right', color: '#64748b', fontWeight: 600 }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTop5.map((t, i) => (
              <tr key={t.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px', textAlign: 'right', color: '#94a3b8', fontFamily: 'monospace' }}>{i + 1}</td>
                <td style={{ padding: '8px', color: '#0f1520', fontWeight: 500 }}>{t.name}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: t.automation_score >= 15 ? '#dc2626' : t.automation_score >= 10 ? '#d97706' : '#4f8ef7', fontFamily: 'monospace', fontWeight: 600 }}>{t.automation_score.toFixed(1)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{t.total_hours?.toFixed(1)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontFamily: 'monospace' }}>{fmtL(t.cost_per_month)}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>{t.employee_count}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: t.rep_pct > 60 ? '#dc2626' : '#d97706' }}>{t.rep_pct?.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Methodology note */}
        <div style={{ marginTop: 24, padding: 12, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
            <strong>Methodology:</strong> Recoverable = Repetitive hours × 70% automation factor ÷ 4 wks × 4.33 avg/month.
            Score = volume(0.35) + rep_rate(0.30) + concentration(0.20) + cost(0.15) × 100.
            Hourly rate = annual CTC ÷ 2,376 working hours/year (9hr × 22 days × 12 months).
            Data: {metrics?.dateRange?.start}–{metrics?.dateRange?.end} · {metrics?.audit?.rows_valid} valid activity rows.
          </p>
        </div>
      </div>
    </>
  )
}