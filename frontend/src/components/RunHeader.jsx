import { Square, RotateCcw, Clock, Link2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

/**
 * RunHeader — shows the current run's question, status pill, stats,
 * and a 5-segment progress bar (one segment per graph node).
 */

const NODE_ORDER = ['plan_steps', 'search_web', 'draft_report', 'review_draft', 'finalize_report']

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

  // Unique node names seen so far (in order)
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
            <span className="spinner" style={{ borderTopColor: 'var(--violet)', borderColor: 'rgba(124,106,240,.3)' }} />
            Running
          </span>
        )}
        {phase === 'error' && (
          <span className="status-pill status-pill-failed">
            <AlertCircle size={12} strokeWidth={2.2} /> Failed
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
        {loopCount > 0 && (
          <span className="stat">
            <RefreshCw size={12} strokeWidth={2} /> <b>{loopCount}</b> refinement loop{loopCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* 5-segment progress bar — one per graph node */}
      <div className="progress-track">
        {NODE_ORDER.map((node) => {
          const isDone   = seenNodes.has(node) && phase !== 'streaming'
          const isActive = seenNodes.has(node) && phase === 'streaming' &&
                           steps[steps.length - 1]?.node === node
          return (
            <div
              key={node}
              className={`progress-seg${isDone ? ' done' : isActive ? ' active' : ''}`}
            />
          )
        })}
      </div>
    </div>
  )
}
