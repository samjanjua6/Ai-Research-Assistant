import { useState, useEffect } from 'react'
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
import PublicReportView from './components/PublicReportView'

function getShareTokenFromPath() {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const { phase, steps, report, history, error, submit, stop, viewRun, activeRunId: hookActiveRunId } = useResearch(user)

  const [shareToken,     setShareToken]     = useState(getShareTokenFromPath)
  const [activeRunId,    setActiveRunId]    = useState(null)
  const [activeQuestion, setActiveQuestion] = useState(null)
  const [formQuestion,   setFormQuestion]   = useState('')
  const [showBanner,     setShowBanner]     = useState(true)

  const currentRunId = activeRunId || hookActiveRunId || report?.id

  // Guest draft preservation — if user types before logging in
  const [pendingQuestion,  setPendingQuestion]  = useState(null)
  const [showAuthModal,    setShowAuthModal]    = useState(false)
  const [authDefaultTab,   setAuthDefaultTab]   = useState('login')

  // Listen to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setShareToken(getShareTokenFromPath())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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

  const handleForkQuestion = (question) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/')
    }
    setShareToken(null)
    setFormQuestion(question)
    handleSubmit(question)
  }

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/')
    }
    setShareToken(null)
  }

  // If visiting a public share URL (/r/:token)
  if (shareToken) {
    return (
      <PublicReportView
        shareToken={shareToken}
        onForkQuestion={handleForkQuestion}
        onGoHome={handleGoHome}
      />
    )
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
          <p>Checking session…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header />

      <div className="layout">
        {/* Left column — question form + run history */}
        <aside className="sidebar">
          <QuestionForm
            question={formQuestion}
            onQuestionChange={setFormQuestion}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
          <HistoryPanel
            runs={history}
            activeRunId={currentRunId}
            onSelect={handleSelectRun}
            onSelectRun={handleSelectRun}
            onRetry={handleSubmit}
          />
        </aside>

        {/* Right column — run details or placeholder */}
        <section className="run-panel" aria-label="Research status and report">

          {/* Banner: folded timeline explanation */}
          {showBanner && hasRun && (
            <div className="info-banner animate-in" role="status">
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
          {showReport && (
            <ReportPanel
              report={report}
              question={activeQuestion}
              runId={currentRunId}
            />
          )}

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
