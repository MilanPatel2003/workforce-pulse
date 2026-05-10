import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useStore } from './store/useStore'
import HeadlineNumbers from './components/Dashboard/HeadlineNumbers'
import TimeSinkBreakdown from './components/Dashboard/TimeSinkBreakdown'
import AutomationRanking from './components/Dashboard/AutomationRanking'
import WeeklyTrend from './components/Dashboard/WeeklyTrend'
import EmployeeDrilldown from './components/Dashboard/EmployeeDrilldown'
import AnomalyCallout from './components/Dashboard/AnomalyCallout'
import DepartmentFilter from './components/Filters/DepartmentFilter'
import IngestionReport from './components/Audit/IngestionReport'
import ChatPanel from './components/AI/ChatPanel'
import ExportButton from './components/Export/ExportButton'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function App() {
  const { setData, setMetrics, setLoading, setError, loading, error, filters, clearFilters } = useStore()
  const [chatOpen, setChatOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get(`${API_URL}/api/data`),
      axios.get(`${API_URL}/api/metrics`),
    ])
      .then(([dataRes, metricsRes]) => {
        setData(dataRes.data)
        setMetrics(metricsRes.data)
        setLoading(false)
      })
      .catch((err) => {
        setError('Failed to load data. Is the backend running?')
        setLoading(false)
        console.error(err)
      })
  }, [])

  const hasFilters = filters.department || filters.taskCategory

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTop: '3px solid #4f8ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Normalizing data…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <p style={{ color: '#f04060', fontSize: 16 }}>⚠ {error}</p>
      <p style={{ color: 'var(--muted)', fontSize: 12 }}>Make sure the backend is running on port 4000</p>
    </div>
  )


  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} className="mobile-overlay" />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ width: 200, background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: 20, overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#4f8ef7', letterSpacing: '0.1em' }}>WORKFORCE</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#4f8ef7', letterSpacing: '0.1em' }}>PULSE</p>
          <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Oct 2025 · 533 valid rows</p>
        </div>

        <DepartmentFilter />

        {hasFilters && (
          <button onClick={clearFilters}
            style={{ marginTop: 16, width: '100%', background: 'rgba(240,64,96,0.1)', border: '1px solid rgba(240,64,96,0.3)', color: '#f04060', borderRadius: 5, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>
            ✕ Clear filters
          </button>
        )}
      </aside>

      {/* Main content */}
      <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Top bar */}
        <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mobile-menu-btn"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 5, padding: '5px 8px', cursor: 'pointer', fontSize: 14 }}>
                ☰
              </button>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>COO Dashboard</h1>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
              Where are we wasting time and money, and what should we automate first?
              {hasFilters && <span style={{ color: '#f5a623', marginLeft: 8 }}>
                Filtered: {[filters.department, filters.taskCategory].filter(Boolean).join(' + ')}
              </span>}
            </p>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', gap: 10 }}>
            <ExportButton />
            <button onClick={() => setChatOpen(!chatOpen)}
              style={{ background: chatOpen ? '#4f8ef7' : 'var(--surface)', border: '1px solid var(--border)', color: chatOpen ? '#fff' : 'var(--text)', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
              {chatOpen ? '× Close AI' : '✦ AI Assistant'}
            </button>
          </div>
        </div>

        <AnomalyCallout />
        <HeadlineNumbers />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <TimeSinkBreakdown />
          <WeeklyTrend />
        </div>

        <AutomationRanking />
        <EmployeeDrilldown />
        <IngestionReport />

        <div style={{ height: 20 }} />
      </main>

      {/* AI Chat panel */}
      <div className="chat-panel" style={{
        width: chatOpen ? 400 : 0,
        overflow: 'hidden',
        transition: 'width 0.25s ease',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>
    </div>
  )
}