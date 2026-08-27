import { useState, useCallback, useEffect } from 'react'
import { Sparkles, Square, RotateCcw, ArrowRight, AlertTriangle } from 'lucide-react'

export default function QuestionForm({ onSubmit, onStop, isLoading, error, initialQuestion }) {
  const [value, setValue] = useState(initialQuestion || '')

  useEffect(() => {
    if (initialQuestion) {
      setValue(initialQuestion)
    }
  }, [initialQuestion])

  const handleSubmit = useCallback(() => {
    const q = value.trim()
    if (!q || isLoading) return
    onSubmit(q)
  }, [value, isLoading, onSubmit])

  const handleRetry = useCallback(() => {
    const q = value.trim()
    if (!q) return
    onSubmit(q)
  }, [value, onSubmit])

  return (
    <div className="card">
      <div className="eyebrow">Ask a research question</div>

      <textarea
        className="question-textarea question-input"
        placeholder="e.g. /DEEP What are the latest breakthroughs in neutral atom quantum computing?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
        disabled={isLoading}
        rows={4}
      />

      {/* ── Methodologist Command-Lens Selector Bar ── */}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Analytical Command Lenses
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            Click to activate methodological lens
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'Deep Dive', prefix: '/DEEP', icon: '🔬', placeholder: 'Topic to analyze in depth' },
            { label: 'Compare', prefix: '/ANGLE', icon: '⚖️', placeholder: '"Tech A" vs "Tech B"' },
            { label: 'Stress Test', prefix: '/CHALLENGE', icon: '⚡', placeholder: 'Topic to find contradictions & white spots' },
            { label: 'Hypotheses', prefix: '/HYP', icon: '💡', placeholder: 'Frontier domain for non-obvious hypotheses' },
            { label: 'Stakeholders', prefix: '/VOICES', icon: '👥', placeholder: 'Controversial topic to map stakeholder positions' },
            { label: 'Mind-Map', prefix: '/ARTEFACT mind-map', icon: '🗺️', placeholder: 'Topic for Mermaid concept hierarchy' },
            { label: 'Timeline', prefix: '/TIMELINE', icon: '⏱️', placeholder: 'Evolution & milestones of topic' },
          ].map((l, idx) => {
            const isActive = value.trim().toUpperCase().startsWith(l.prefix.toUpperCase())
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const current = value.trim()
                  const cleaned = current.replace(/^\/(?:DEEP|ANGLE|CHALLENGE|HYP|VOICES|ARTEFACT(?:\s+[a-zA-Z0-9_-]+)?|TIMELINE|MIX|SCAN)\s*/i, '').trim()
                  if (!cleaned) {
                    setValue(`${l.prefix} ${l.placeholder}`)
                  } else if (l.prefix === '/ANGLE' && !cleaned.toLowerCase().includes(' vs ')) {
                    setValue(`/ANGLE "${cleaned}" vs "Alternative"`)
                  } else {
                    setValue(`${l.prefix} ${cleaned}`)
                  }
                }}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '4px 9px',
                  borderRadius: 6,
                  border: `1px solid ${isActive ? 'var(--violet)' : 'var(--border)'}`,
                  backgroundColor: isActive ? 'rgba(124, 106, 240, 0.12)' : 'var(--panel-alt)',
                  color: isActive ? 'var(--violet)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                }}
                title={`Apply ${l.prefix} analytical lens`}
              >
                <span>{l.icon}</span>
                <span>{l.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="question-tip" style={{ marginTop: 8 }}>Tip: Press Ctrl + Enter (or Cmd + Enter) to run</div>

      <div className="form-actions">
        {isLoading ? (
          <div className="button-group">
            <button className="run-btn running-btn" disabled>
              <span className="spinner" /> Researching…
            </button>
            <button
              className="stop-btn"
              onClick={onStop}
              type="button"
              title="Stop research agent"
            >
              <Square size={12} fill="currentColor" /> Stop
            </button>
          </div>
        ) : (
          <button
            className="run-btn"
            onClick={handleSubmit}
            disabled={!value.trim()}
          >
            <Sparkles size={14} strokeWidth={2} />
            <span>Run research</span>
            <ArrowRight size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-text">
            <AlertTriangle size={14} strokeWidth={2} className="inline-icon" /> {error}
          </div>
          <button
            className="retry-btn-inline"
            onClick={handleRetry}
            disabled={isLoading || !value.trim()}
          >
            <RotateCcw size={12} strokeWidth={2} /> Retry
          </button>
        </div>
      )}
    </div>
  )
}
