import { Square, RotateCcw, Clock, Link2, RefreshCw, CheckCircle2, AlertCircle, Users, Zap } from 'lucide-react'

/**
 * RunHeader — shows the current run's question, status pill, stats,
 * and dynamic progress segments per engine.
 */

const LANGGRAPH_NODES = ['plan_steps', 'search_web', 'draft_report', 'review_draft', 'finalize_report']
const CREWAI_NODES = ['crew_methodologist', 'crew_scout', 'crew_synthesizer', 'crew_auditor']

function elapsedSince(steps) {
  if (steps.length < 2) return null
  const first = new Date(steps[0].logged_at)
  const last  = new Date(steps[steps.length - 1].logged_at)
  const secs  = Math.round((last - first) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

export default function RunHeader({ question, phase, steps, report, onStop, onRetry }) {
  const elapsed      = elapsedSince(steps)
  const sourcesCount = report?.sources?.length ?? 0
  const loopCount    = steps.filter(s => s.node === 'review_draft').length

  const isCrew = report?.engine === 'crewai' || steps.some(
    s => (s.node && s.node.startsWith('crew_')) || s.payload?.agent
  )

  const activeNodes = isCrew ? CREWAI_NODES : LANGGRAPH_NODES
  const seenNodes = new Set(steps.map(s => s.node))

  return (
    <div className="card">
      <div className="run-header-top">
        <div>
          <div className="eyebrow">Current run</div>
          <div className="run-header-question">{question}</div>
        </div>

        <div className="run-header-actions">
          {phase === 'streaming' && onStop && (
            <button className="stop-btn-compact" onClick={onStop} title="Stop research agent">
              <Square size={12} fill="currentColor" /> Stop
            </button>
          )}
          {phase === 'error' && onRetry && (
            <button className="retry-btn-compact icon-btn-spin-on-hover" onClick={() => onRetry(question)} title="Retry research">
              <RotateCcw size={13} strokeWidth={2} /> Retry
            </button>
          )}
        </div>
      </div>

      <div className="meta-row">
        {phase === 'done' && (
          <span className="status-pill status-pill-done">
            <CheckCircle2 size={12} strokeWidth={2.2} /> Done
          </span>
        )}
        {phase === 'streaming' && (
          <span className="status-pill status-pill-running">
            <span className="spinner" style={{ borderTopColor: isCrew ? 'var(--violet)' : '#06b6d4', borderColor: isCrew ? 'rgba(124,106,240,.3)' : 'rgba(6,182,212,.3)' }} />
            Running
          </span>
        )}
        {phase === 'error' && (
          <span className="status-pill status-pill-failed">
            <AlertCircle size={12} strokeWidth={2.2} /> Failed
          </span>
        )}

        {isCrew ? (
          <span
            className="chip"
            style={{
              color: 'var(--violet)',
              backgroundColor: 'rgba(124, 106, 240, 0.12)',
              border: '1px solid rgba(124, 106, 240, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <Users size={11} strokeWidth={2.2} /> CrewAI (4 Agents)
          </span>
        ) : (
          <span
            className="chip"
            style={{
              color: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <Zap size={11} strokeWidth={2.2} /> LangGraph Engine
          </span>
        )}

        {elapsed && (
          <span className="stat">
            <Clock size={12} strokeWidth={2} /> <b>{elapsed}</b>
          </span>
        )}
        {sourcesCount > 0 && (
          <span className="stat">
            <Link2 size={12} strokeWidth={2} /> <b>{sourcesCount}</b> sources
          </span>
        )}
        {!isCrew && loopCount > 0 && (
          <span className="stat">
            <RefreshCw size={12} strokeWidth={2} /> <b>{loopCount}</b> refinement loop{loopCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Progress track segments */}
      <div className="progress-track">
        {activeNodes.map((node) => {
          const isNodeDone = (seenNodes.has(node) && phase !== 'streaming') || (phase === 'done')
          const isNodeActive = seenNodes.has(node) && phase === 'streaming' && steps[steps.length - 1]?.node === node
          return (
            <div
              key={node}
              className={`progress-seg${isNodeDone ? ' done' : isNodeActive ? ' active' : ''}`}
            />
          )
        })}
      </div>
    </div>
  )
}
