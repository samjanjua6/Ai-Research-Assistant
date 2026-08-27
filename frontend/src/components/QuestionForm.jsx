import { useState, useCallback, useEffect } from 'react'
import {
  Sparkles,
  Square,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  Microscope,
  GitCompare,
  ShieldAlert,
  Lightbulb,
  Users,
  Network,
  History,
} from 'lucide-react'

const COMMAND_LENSES = [
  { id: 'deep', label: 'Deep Dive', prefix: '/DEEP', Icon: Microscope, placeholder: '"Topic to analyze in depth"' },
  { id: 'angle', label: 'Compare', prefix: '/ANGLE', Icon: GitCompare, placeholder: '"Tech A" vs "Tech B"' },
  { id: 'challenge', label: 'Stress Test', prefix: '/CHALLENGE', Icon: ShieldAlert, placeholder: '"Topic to find contradictions & white spots"' },
  { id: 'hyp', label: 'Hypotheses', prefix: '/HYP', Icon: Lightbulb, placeholder: '"Frontier domain for non-obvious hypotheses"' },
  { id: 'voices', label: 'Stakeholders', prefix: '/VOICES', Icon: Users, placeholder: '"Topic to map stakeholder positions"' },
  { id: 'artefact', label: 'Mind-Map', prefix: '/ARTEFACT mind-map', Icon: Network, placeholder: '"Topic for Mermaid concept hierarchy"' },
  { id: 'timeline', label: 'Timeline', prefix: '/TIMELINE', Icon: History, placeholder: '"Evolution & milestones of topic"' },
]

const PLACEHOLDER_PATTERNS = [
  'topic to analyze in depth',
  'tech a',
  'tech b',
  'topic to find contradictions',
  'frontier domain for non-obvious',
  'topic to map stakeholder',
  'topic for mermaid concept',
  'evolution & milestones',
  'alternative',
]

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

  const handleSelectLens = (lens) => {
    const current = value.trim()
    // Strip existing slash command prefix
    const body = current.replace(/^\/(?:DEEP|ANGLE|CHALLENGE|HYP|VOICES|ARTEFACT(?:\s+[a-zA-Z0-9_-]+)?|TIMELINE|MIX|SCAN)\s*/i, '').trim()

    // Check if the current body is empty or just contains generic placeholder strings
    const isPlaceholder = !body || PLACEHOLDER_PATTERNS.some((p) => body.toLowerCase().includes(p))

    if (isPlaceholder) {
      setValue(`${lens.prefix} ${lens.placeholder}`)
      return
    }

    if (lens.prefix === '/ANGLE') {
      if (/\b(?:vs\.?|versus|against)\b/i.test(body)) {
        setValue(`/ANGLE ${body}`)
      } else {
        const cleanTopic = body.replace(/^"|"$/g, '').trim()
        setValue(`/ANGLE "${cleanTopic}" vs "Alternative"`)
      }
    } else {
      // Switching to a single-topic lens: strip 'vs ...' if coming from an angle comparison
      let singleTopic = body
      if (/\b(?:vs\.?|versus|against)\b/i.test(body)) {
        singleTopic = body.split(/\b(?:vs\.?|versus|against)\b/i)[0].trim()
      }
      singleTopic = singleTopic.replace(/^"|"$/g, '').trim()
      setValue(`${lens.prefix} "${singleTopic}"`)
    }
  }

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
            Select lens to direct research angle
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {COMMAND_LENSES.map((l) => {
            const isActive = value.trim().toUpperCase().startsWith(l.prefix.toUpperCase())
            const Icon = l.Icon
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => handleSelectLens(l)}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: `1px solid ${isActive ? 'var(--violet)' : 'var(--border)'}`,
                  backgroundColor: isActive ? 'rgba(124, 106, 240, 0.12)' : 'var(--panel-alt)',
                  color: isActive ? 'var(--violet)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
                title={`Apply ${l.prefix} analytical lens`}
              >
                <Icon size={13} strokeWidth={2} />
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
