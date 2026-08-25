/**
 * HistoryPanel — run cards with status dot, time, duration/loop chips, and retry buttons.
 */
export default function HistoryPanel({ runs, activeRunId, onSelect, onSelectRun, onRetry }) {
  const handleSelect = onSelect || onSelectRun || (() => {})

  return (
    <div className="card">
      <div className="eyebrow" style={{ marginBottom: 12 }}>Recent runs</div>

      {runs.length === 0 ? (
        <p className="history-empty">No runs yet.</p>
      ) : (
        <div className="history-stack">
          {runs.map((run) => {
            const time = new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const dotClass = `dot dot-${run.status}`
            const isActive = run.id === activeRunId

            return (
              <div
                key={run.id}
                className={`run-card${isActive ? ' active' : ''}`}
                onClick={() => handleSelect(run.id)}
              >
                <div className="run-card-q" title={run.question}>
                  {run.question}
                </div>

                <div className="run-meta">
                  <span className={dotClass} />
                  <span className="run-time">
                    {run.status.charAt(0).toUpperCase() + run.status.slice(1)} · {time}
                  </span>

                  {run.status === 'done' && run.loop_count > 0 && (
                    <span className="chip" style={{ marginLeft: 'auto' }}>
                      {run.loop_count} loop{run.loop_count !== 1 ? 's' : ''}
                    </span>
                  )}

                  {run.status === 'failed' && onRetry && (
                    <button
                      className="history-retry-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRetry(run.question)
                      }}
                      title="Retry this research run"
                    >
                      🔄 Retry
                    </button>
                  )}
                </div>

                {run.status === 'failed' && (
                  <div className="fail-reason">
                    {run.error || 'Run failed — check server logs.'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
