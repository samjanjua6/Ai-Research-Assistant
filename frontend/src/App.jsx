import { useState, useEffect, useCallback } from 'react'
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
import LiveDraftPreview from './components/LiveDraftPreview'

function getShareTokenFromPath() {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

function getInitialSidebarState() {
  if (typeof window === 'undefined') return false
  const saved = localStorage.getItem('sidebar_collapsed')
  if (saved !== null) return saved === 'true'
  return window.innerWidth < 1100
}

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const {
    phase,
    steps,
    report,
    streamingText,
    streamingNode,
    streamingLoop,
    history,
    error,
    submit,
    stop,
    viewRun,
    activeRunId: hookActiveRunId,
  } = useResearch(user)

  const [shareToken,          setShareToken]          = useState(getShareTokenFromPath)
  const [isSidebarCollapsed,  setIsSidebarCollapsed]  = useState(getInitialSidebarState)
  const [activeRunId,         setActiveRunId]         = useState(null)
  const [activeQuestion,      setActiveQuestion]      = useState(null)
  const [formQuestion,        setFormQuestion]        = useState('')
  const [showBanner,          setShowBanner]          = useState(true)

  // Guest draft preservation — if user types before logging in
  const [pendingQuestion,  setPendingQuestion]  = useState(null)
  const [showAuthModal,    setShowAuthModal]    = useState(false)
  const [authDefaultTab,   setAuthDefaultTab]   = useState('login')

  const currentRunId = activeRunId || hookActiveRunId || report?.id

  // Toggle sidebar and persist
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar_collapsed', String(next))
      }
      return next
    })
  }, [])

  // Quick New Research action from header when collapsed
  const handleNewResearch = useCallback(() => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar_collapsed', 'false')
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [isSidebarCollapsed])

  // Listen to keyboard shortcut: Ctrl+B / Cmd+B and Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        handleToggleSidebar()
      } else if (e.key === 'Escape' && !isSidebarCollapsed && typeof window !== 'undefined' && window.innerWidth < 1100) {
        setIsSidebarCollapsed(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleToggleSidebar, isSidebarCollapsed])

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

    // On mobile, auto-close sidebar drawer upon submitting
    if (typeof window !== 'undefined' && window.innerWidth < 1100) {
      setIsSidebarCollapsed(true)
    }
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
    const run = history.find((r) => r.id === runId)
    setActiveRunId(runId)
    setActiveQuestion(run?.question || null)
    if (run?.question) setFormQuestion(run.question)
    viewRun(runId)

    // On mobile, auto-close sidebar drawer upon selecting a run
    if (typeof window !== 'undefined' && window.innerWidth < 1100) {
      setIsSidebarCollapsed(true)
    }
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
      <Header
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onNewResearch={handleNewResearch}
      />

      {/* Mobile drawer backdrop when sidebar is open on screens < 1100px */}
      {!isSidebarCollapsed && (
        <div
          className="sidebar-drawer-backdrop"
          onClick={() => setIsSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Floating expand tab button when collapsed on desktop */}
      {isSidebarCollapsed && (
        <button
          type="button"
          className="floating-sidebar-tab animate-in"
          onClick={handleToggleSidebar}
          title="Expand sidebar (Ctrl+B)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
            <line x1="9" x2="9" y1="3" y2="21"/>
          </svg>
          <span>Sidebar</span>
        </button>
      )}

      <div className={`layout${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        {/* Left column — question form + run history */}
        <aside className="sidebar">
          <div className="sidebar-top-row">
            <span className="sidebar-top-label">Workspace</span>
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={handleToggleSidebar}
              title="Collapse sidebar (Ctrl+B)"
              aria-label="Collapse sidebar"
            >
              «
            </button>
          </div>

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

          {/* Real-time streaming draft display */}
          {phase === 'streaming' && streamingText && (
            <LiveDraftPreview
              text={streamingText}
              node={streamingNode}
              loop={streamingLoop}
            />
          )}

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
