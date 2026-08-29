import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RotateCcw } from 'lucide-react'
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
import { AdminDashboard } from './components/admin/AdminDashboard'
import { UsageAnalyticsDashboard } from './components/analytics/UsageAnalyticsDashboard'
import { ResearchLibraryHub } from './components/library/ResearchLibraryHub'
import { ErrorStateIllustration, EmptyState } from './components/illustrations/EmptyStateIllustrations'
import { LogoMark } from './components/brand/Logo'

function getShareTokenFromPath() {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

function getIsAdminPath() {
  if (typeof window === 'undefined') return false
  return (
    window.location.pathname === '/admin' ||
    window.location.pathname.startsWith('/admin/') ||
    window.location.search.includes('view=admin')
  )
}

function getIsAnalyticsPath() {
  if (typeof window === 'undefined') return false
  return (
    window.location.pathname === '/analytics' ||
    window.location.pathname.startsWith('/analytics/') ||
    window.location.search.includes('view=analytics')
  )
}

function getIsLibraryPath() {
  if (typeof window === 'undefined') return false
  return (
    window.location.pathname === '/library' ||
    window.location.pathname.startsWith('/library/') ||
    window.location.search.includes('view=library')
  )
}

function getMagicResetParams() {
  if (typeof window === 'undefined') return { email: '', code: '' }
  try {
    const params = new URLSearchParams(window.location.search)
    return {
      email: params.get('reset_email') || '',
      code: params.get('reset_code') || '',
    }
  } catch {
    return { email: '', code: '' }
  }
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
  const [isAdminView,         setIsAdminView]         = useState(getIsAdminPath)
  const [isAnalyticsView,     setIsAnalyticsView]     = useState(getIsAnalyticsPath)
  const [isLibraryView,       setIsLibraryView]       = useState(getIsLibraryPath)
  const [magicReset,          setMagicReset]          = useState(getMagicResetParams)
  const [isSidebarCollapsed,  setIsSidebarCollapsed]  = useState(getInitialSidebarState)
  const [activeRunId,         setActiveRunId]         = useState(null)
  const [activeQuestion,      setActiveQuestion]      = useState(null)
  const [formQuestion,        setFormQuestion]        = useState('')
  const [showBanner,          setShowBanner]          = useState(true)
  const [selectedEngine,      setSelectedEngine]      = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('research_engine') || 'langgraph'
    }
    return 'langgraph'
  })
  const [activeEngine,        setActiveEngine]        = useState(null)

  // Guest draft preservation — if user types before logging in
  const [pendingQuestion,  setPendingQuestion]  = useState(null)
  const [showAuthModal,    setShowAuthModal]    = useState(() => {
    const reset = getMagicResetParams()
    return Boolean(reset.code && reset.email)
  })
  const [authDefaultTab,   setAuthDefaultTab]   = useState('login')

  const currentRunId = activeRunId || hookActiveRunId || report?.id
  const currentEngine = report?.engine || activeEngine || selectedEngine

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
      setIsAdminView(getIsAdminPath())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // ── Handlers ─────────────────────────────────────────────────
  const handleSubmit = (payload) => {
    const q = typeof payload === 'string' ? payload : (payload?.question || '')
    const eng = (typeof payload === 'object' && payload?.engine) ? payload.engine : selectedEngine
    const finalPayload = typeof payload === 'object' ? { ...payload, engine: eng } : { question: q, engine: eng }
    if (!user) {
      // Save draft, open auth modal
      setPendingQuestion(finalPayload)
      setFormQuestion(q)
      setAuthDefaultTab('login')
      setShowAuthModal(true)
      return
    }
    setActiveRunId(null)
    setActiveQuestion(q)
    setFormQuestion(q)
    setActiveEngine(eng)
    submit(finalPayload)

    // On mobile, auto-close sidebar drawer upon submitting
    if (typeof window !== 'undefined' && window.innerWidth < 1100) {
      setIsSidebarCollapsed(true)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    // If there was a pending question, auto-submit it
    if (pendingQuestion) {
      const p = pendingQuestion
      const q = typeof p === 'string' ? p : (p?.question || '')
      const eng = (typeof p === 'object' && p?.engine) ? p.engine : selectedEngine
      const finalPayload = typeof p === 'object' ? { ...p, engine: eng } : { question: q, engine: eng }
      setPendingQuestion(null)
      setActiveRunId(null)
      setActiveQuestion(q)
      setActiveEngine(eng)
      submit(finalPayload)
    }
  }

  const handleSelectRun = (runId) => {
    const run = history.find((r) => r.id === runId)
    setActiveRunId(runId)
    setActiveQuestion(run?.question || null)
    setActiveEngine(run?.engine || 'langgraph')
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

  // If visiting admin dashboard (/admin)
  if (isAdminView) {
    return (
      <AdminDashboard
        onBackToApp={() => {
          setIsAdminView(false)
          window.history.pushState({}, '', '/')
        }}
      />
    )
  }

  // If visiting personal analytics dashboard (/analytics)
  if (isAnalyticsView) {
    return (
      <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header
          isSidebarCollapsed={true}
          onToggleSidebar={() => {}}
          onNewResearch={() => {
            setIsAnalyticsView(false)
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/')
            handleNewResearch()
          }}
          onOpenAdmin={() => {
            setIsAnalyticsView(false)
            setIsAdminView(true)
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/admin')
          }}
          onOpenAnalytics={() => {}}
          onOpenLibrary={() => {
            setIsAnalyticsView(false)
            setIsLibraryView(true)
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/library')
          }}
          engine={currentEngine}
        />
        <main className="main-content" style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <UsageAnalyticsDashboard
            onBackToWorkspace={() => {
              setIsAnalyticsView(false)
              if (typeof window !== 'undefined') window.history.pushState({}, '', '/')
            }}
            onSelectTopic={(topicText) => {
              setIsAnalyticsView(false)
              if (typeof window !== 'undefined') window.history.pushState({}, '', '/')
              setFormQuestion(topicText)
              setTimeout(() => {
                const input = document.querySelector('.question-input')
                if (input) {
                  input.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  input.focus()
                }
              }, 100)
            }}
          />
        </main>
      </div>
    )
  }

  // If visiting research library & collections hub (/library)
  if (isLibraryView) {
    return (
      <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header
          isSidebarCollapsed={true}
          onToggleSidebar={() => {}}
          onNewResearch={() => {
            setIsLibraryView(false)
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/')
            handleNewResearch()
          }}
          onOpenAdmin={() => {
            setIsLibraryView(false)
            setIsAdminView(true)
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/admin')
          }}
          onOpenAnalytics={() => {
            setIsLibraryView(false)
            setIsAnalyticsView(true)
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/analytics')
          }}
          onOpenLibrary={() => {}}
          engine={currentEngine}
        />
        <main className="main-content" style={{ padding: '24px 20px', maxWidth: 1300, margin: '0 auto', width: '100%' }}>
          <ResearchLibraryHub
            onBackToWorkspace={() => {
              setIsLibraryView(false)
              if (typeof window !== 'undefined') window.history.pushState({}, '', '/')
            }}
            onOpenRun={(runId, question) => {
              setIsLibraryView(false)
              if (typeof window !== 'undefined') window.history.pushState({}, '', '/')
              setActiveRunId(runId)
              setActiveQuestion(question)
              viewRun(runId)
            }}
          />
        </main>
      </div>
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
          <LogoMark size={32} />
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
        engine={currentEngine}
        onOpenAdmin={() => {
          setIsAdminView(true)
          setIsAnalyticsView(false)
          setIsLibraryView(false)
          window.history.pushState({}, '', '/admin')
        }}
        onOpenAnalytics={() => {
          setIsAnalyticsView(true)
          setIsAdminView(false)
          setIsLibraryView(false)
          window.history.pushState({}, '', '/analytics')
        }}
        onOpenLibrary={() => {
          setIsLibraryView(true)
          setIsAdminView(false)
          setIsAnalyticsView(false)
          window.history.pushState({}, '', '/library')
        }}
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
            initialQuestion={formQuestion}
            question={formQuestion}
            onQuestionChange={setFormQuestion}
            engine={selectedEngine}
            onEngineChange={(eng) => {
              setSelectedEngine(eng)
              if (typeof window !== 'undefined') {
                localStorage.setItem('research_engine', eng)
              }
            }}
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
              engine={currentEngine}
              onStop={stop}
              onRetry={handleSubmit}
            />
          )}

          {/* Live progress timeline */}
          <ProgressTimeline steps={steps} phase={phase} engine={currentEngine} />

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
              onSelectQuestion={(qText, autoSubmit) => {
                setFormQuestion(qText)
                if (autoSubmit) {
                  handleSubmit(qText)
                } else {
                  const input = document.querySelector('.question-input')
                  if (input) {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    input.focus()
                  }
                }
              }}
            />
          )}

          {/* Error Recovery Card */}
          {phase === 'error' && (
            <div className="card animate-in" style={{ textAlign: 'center', padding: '32px 20px' }}>
              <EmptyState
                illustration={<ErrorStateIllustration size={100} />}
                title="Research Encountered an Issue"
                description={error || "The research run failed to complete. You can retry with the same question or modify your query."}
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSubmit(activeQuestion || formQuestion)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <RotateCcw size={14} strokeWidth={2} />
                    <span>Retry Research Run</span>
                  </button>
                }
              />
            </div>
          )}

          {/* Empty state with suggestions */}
          {!hasRun && <Placeholder onSelectSuggestion={handleSuggestion} />}

        </section>
      </div>

      {/* Auth modal (guest sign-in prompt or manual open from header) */}
      {showAuthModal && (
        <AuthModal
          onClose={() => {
            setShowAuthModal(false)
            if (window.location.search) {
              window.history.replaceState({}, '', window.location.pathname)
            }
          }}
          onSuccess={(authedUser) => {
            if (window.location.search) {
              window.history.replaceState({}, '', window.location.pathname)
            }
            handleAuthSuccess(authedUser)
          }}
          defaultTab={authDefaultTab}
          initialEmail={magicReset.email}
          initialResetCode={magicReset.code}
        />
      )}
    </>
  )
}
