import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const STARTERS = [
  "What's the single highest-ROI automation we should ship next?",
  "Who is spending the most time on repetitive tasks?",
  "Which department has the worst repetitive task share?",
  "Show me everyone whose rep share is above 60%.",
]

export default function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async (text) => {
    const content = text || input.trim()
    if (!content) return
    const userMsg = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post(`${API_URL}/api/ai/chat`, { messages: newMessages })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      const msg = err?.response?.data?.error || 'AI unavailable. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>✦ AI Assistant</p>
          <p style={{ fontSize: 10, color: 'var(--muted)' }}>Grounded in your normalized dataset · Gemini 2.5 Flash</p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 10 }}>Ask me anything about the data:</p>
            {STARTERS.map(s => (
              <button key={s} onClick={() => send(s)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', fontSize: 11, marginBottom: 6, lineHeight: 1.4 }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '10px 12px', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: m.role === 'user' ? '#4f8ef7' : 'var(--surface2)',
              border: m.role === 'user' ? 'none' : '1px solid var(--border)',
              fontSize: 12, color: m.role === 'user' ? '#fff' : 'var(--text)',
              lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {m.content.includes('[Source:') ? (
                <>
                  <span>{m.content.substring(0, m.content.lastIndexOf('[Source:'))}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 10, display: 'block', marginTop: 6, fontStyle: 'italic' }}>
                    {m.content.substring(m.content.lastIndexOf('[Source:'))}
                  </span>
                </>
              ) : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px 0' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f8ef7', animation: `pulse 1.2s ${i * 0.2}s infinite`, display: 'inline-block' }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(240,64,96,0.1)', border: '1px solid rgba(240,64,96,0.3)', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#f04060' }}>
            {error}
            <button onClick={() => { setError(null); send(messages[messages.length - 1]?.content) }}
              style={{ marginLeft: 8, background: 'none', border: 'none', color: '#4f8ef7', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>
              Retry
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Ask about the data…"
            rows={2}
            style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontSize: 12, resize: 'none', fontFamily: 'var(--font-body)', lineHeight: 1.4, outline: 'none' }} />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{ background: loading || !input.trim() ? 'var(--border)' : '#4f8ef7', border: 'none', color: loading || !input.trim() ? 'var(--muted)' : '#fff', borderRadius: 6, padding: '0 14px', cursor: loading || !input.trim() ? 'default' : 'pointer', fontSize: 16 }}>
            ↑
          </button>
        </div>
        <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Multi-turn · ↵ to send · Shift+↵ new line</p>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  )
}
