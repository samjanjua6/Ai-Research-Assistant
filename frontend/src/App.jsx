import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useResearch } from './hooks/useResearch'
import { AuthModal } from './components/AuthModal'

import Header           from './components/Header'
import QuestionForm     from './components/QuestionForm'
import HistoryPanel     from './components/HistoryPanel'
import RunHeader        from './components/RunHeader'
import ProgressTimeline from './components/ProgressTimeline'
import ReportPanel      from './components/ReportPanel'
import Placeholder      from './components/Placeholder'

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const { phase, steps, report, history, error, submit, stop, viewRun } = useResearch(user)

  const [activeRunId,    setActiveRunId]    = useState(null)
  const [activeQuestion, setActiveQuestion] = useState(null)
  const [formQuestion,   setFormQuestion]   = useState('')
  const [showBanner,     setShowBanner]     = useState(true)

  // Guest draft preservation — if user types before logging in
  const [pendingQuestion,  setPendingQuestion]  = useState(null)
  const [showAuthModal,    setShowAuthModal]    = useState(false)
  const [authDefaultTab,   setAuthDefaultTab]   = useState('login')

  // ── Handlers ─────────────────────────────────────────────────
  const handleSubmit = (question) => {
    if (!user) {
      // Save draft, open auth modal
      setPendingQuestion(question)
      setFormQuestion(question)
      setAuthDefaultTab('login')
      setShowAuthModal(true)
      return
    }
    setActiveRunId(null)
    setActiveQuestion(question)
    setFormQuestion(question)
    submit(question)
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    // If there was a pending question, auto-submit it
    if (pendingQuestion) {
      const q = pendingQuestion
      setPendingQuestion(null)
      setActiveRunId(null)
      setActiveQuestion(q)
      submit(q)
    }
  }

  const handleSelectRun = (runId) => {
    const run = history.find(r => r.id === runId)
    setActiveRunId(runId)
    setActiveQuestion(run?.question || null)
    if (run?.question) setFormQuestion(run.question)
    viewRun(runId)
  }

  const handleSuggestion = (question) => {
    setFormQuestion(question)
    handleSubmit(question)
  }

  const isLoading  = phase === 'streaming'
  const hasRun     = phase !== 'idle' || steps.length > 0 || report !== null
  const showReport = phase === 'done' && report

  // Show a full-page loading splash while session is being checked
  if (authLoading) {
    return (
      <div className="auth-splash">
        <div className="auth-splash-inner">
          <span className="topbar-mark">🔬</span>
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header />

      <div className="layout">
        {/* ── Left sidebar ── */}
        <aside className="sidebar">
          <QuestionForm
            onSubmit={handleSubmit}
            onStop={stop}
            isLoading={isLoading}
            error={phase === 'error' ? error : null}
            initialQuestion={formQuestion}
          />

          {user ? (
            <HistoryPanel
              runs={history}
              activeRunId={activeRunId}
              onSelect={handleSelectRun}
              onRetry={handleSubmit}
            />
          ) : (
            <div className="history-guest-prompt">
              <p className="history-guest-text">
                <button
                  className="link-btn"
                  onClick={() => { setAuthDefaultTab('signup'); setShowAuthModal(true) }}
                >
                  Create a free account
                </button>
                {' '}to save your research history.
              </p>
            </div>
          )}
        </aside>

        {/* ── Right run panel ── */}
        <section className="run-panel">

          {/* Info banner — shown once */}
          {showBanner && hasRun && (
            <div className="info-banner animate-in">
              <span>
                Refinement loops now fold into one block.
                Use the toggle in the timeline to compare with the flat log.
              </span>
              <button
                className="info-banner-close"
                aria-label="Dismiss"
                onClick={() => setShowBanner(false)}
              >
                ×
              </button>
            </div>
          )}

          {/* Run header — question + stats + progress bar */}
          {hasRun && activeQuestion && (
            <RunHeader
              question={activeQuestion}
              phase={phase}
              steps={steps}
              report={report}
              onStop={stop}
              onRetry={handleSubmit}
            />
          )}

          {/* Live progress timeline */}
          <ProgressTimeline steps={steps} phase={phase} />

          {/* Final report */}
          {showReport && <ReportPanel report={report} question={activeQuestion} />}

          {/* Empty state with suggestions */}
          {!hasRun && <Placeholder onSelectSuggestion={handleSuggestion} />}

        </section>
      </div>

      {/* Auth modal (guest sign-in prompt or manual open from header) */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          defaultTab={authDefaultTab}
        />
      )}
    </>
  )
}
