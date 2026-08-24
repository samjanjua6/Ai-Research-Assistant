import { useState, useCallback, useEffect } from 'react'

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
        className="question-textarea"
        placeholder="e.g. What are the latest breakthroughs in quantum computing?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
        disabled={isLoading}
        rows={4}
      />

      <div className="question-tip">Tip: Press ⌘/Ctrl + Enter to run</div>

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
              ⏹ Stop
            </button>
          </div>
        ) : (
          <button
            className="run-btn"
            onClick={handleSubmit}
            disabled={!value.trim()}
          >
            Run research →
          </button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-text">⚠️ {error}</div>
          <button
            className="retry-btn-inline"
            onClick={handleRetry}
            disabled={isLoading || !value.trim()}
          >
            🔄 Retry
          </button>
        </div>
      )}
    </div>
  )
}
