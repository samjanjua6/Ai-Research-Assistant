import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Search,
  Zap,
  Rocket,
  Atom,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  NoRunsIllustration,
  NoMatchesIllustration,
  EmptyState,
} from './illustrations/EmptyStateIllustrations'

function renderHighlightedText(text, words) {
  if (!words.length || !text) return text
  const escapedWords = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

/**
 * HistoryPanel — searchable run cards with multi-word matching, summary search,
 * status filter pills, keyword highlighting, pagination, and keyboard navigation.
 */
export default function HistoryPanel({ runs, activeRunId, onSelect, onSelectRun, onRetry }) {
  const handleSelect = onSelect || onSelectRun || (() => {})

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'done' | 'failed'
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Reset to page 1 whenever filters or search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const words = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase()
    return trimmed ? trimmed.split(/\s+/).filter(Boolean) : []
  }, [searchQuery])

  // Filter runs based on keyword & status
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      // 1. Status Filter
      if (statusFilter !== 'all' && run.status !== statusFilter) {
        return false
      }

      // 2. Keyword Filter (multi-word match across question & summary)
      if (words.length > 0) {
        const qText = (run.question || '').toLowerCase()
        const sText = (run.summary || '').toLowerCase()
        const matchAll = words.every((w) => qText.includes(w) || sText.includes(w))
        if (!matchAll) return false
      }

      return true
    })
  }, [runs, statusFilter, words])

  // Pagination computations
  const totalItems = filteredRuns.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = (validCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const paginatedRuns = useMemo(() => {
    return filteredRuns.slice(startIndex, endIndex)
  }, [filteredRuns, startIndex, endIndex])

  // Handle keyboard navigation inside search input
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && filteredRuns.length > 0) {
        e.preventDefault()
        handleSelect(filteredRuns[0].id)
      } else if (e.key === 'Escape') {
        setSearchQuery('')
      }
    },
    [filteredRuns, handleSelect]
  )

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'all'

  // Summary counts for filter pills
  const doneCount = useMemo(() => runs.filter((r) => r.status === 'done').length, [runs])
  const failedCount = useMemo(() => runs.filter((r) => r.status === 'failed').length, [runs])

  return (
    <div className="card">
      <div className="history-header-row">
        <div className="eyebrow">
          Recent runs
          {isFiltered && runs.length > 0 && (
            <span className="history-match-badge">
              {filteredRuns.length} of {runs.length}
            </span>
          )}
        </div>
      </div>

      {/* Search and status filters (visible when user has 2+ runs or has active search) */}
      {(runs.length >= 2 || isFiltered) && (
        <div className="history-filter-section">
          <div className="history-search-wrap">
            <span className="history-search-icon">
              <Search size={13} strokeWidth={2} />
            </span>
            <input
              type="text"
              className="history-search-input"
              placeholder="Search history (e.g. quantum, fusion)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Search research history"
            />
            {searchQuery && (
              <button
                type="button"
                className="history-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search (Esc)"
                aria-label="Clear search"
              >
                <X size={12} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Quick status filter pills */}
          <div className="history-filter-pills" role="radiogroup" aria-label="Filter runs by status">
            <button
              type="button"
              className={`history-filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({runs.length})
            </button>
            {doneCount > 0 && (
              <button
                type="button"
                className={`history-filter-pill ${statusFilter === 'done' ? 'active' : ''}`}
                onClick={() => setStatusFilter('done')}
              >
                <CheckCircle2 size={11} strokeWidth={2} /> Done ({doneCount})
              </button>
            )}
            {failedCount > 0 && (
              <button
                type="button"
                className={`history-filter-pill ${statusFilter === 'failed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('failed')}
              >
                <AlertCircle size={11} strokeWidth={2} /> Failed ({failedCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stack of Run Cards */}
      {runs.length === 0 ? (
        <EmptyState
          illustration={<NoRunsIllustration size={80} />}
          title="No research runs yet"
          description="Your past research queries will appear here."
          className="history-empty-card"
        >
          {onRetry && (
            <div className="sidebar-empty-prompts">
              <span className="sidebar-empty-prompt-label">Quick research topics:</span>
              <div className="sidebar-empty-chips">
                <button
                  type="button"
                  className="sidebar-starter-chip"
                  onClick={() => onRetry('What are the latest breakthroughs and commercialization milestones for solid-state batteries in 2026?')}
                >
                  <Zap size={11} strokeWidth={2} /> Batteries
                </button>
                <button
                  type="button"
                  className="sidebar-starter-chip"
                  onClick={() => onRetry('What is the current status and roadmap of private commercial fusion energy ventures?')}
                >
                  <Rocket size={11} strokeWidth={2} /> Fusion
                </button>
                <button
                  type="button"
                  className="sidebar-starter-chip"
                  onClick={() => onRetry('What are the latest breakthroughs in fault-tolerant quantum computing architectures?')}
                >
                  <Atom size={11} strokeWidth={2} /> Quantum
                </button>
              </div>
            </div>
          )}
        </EmptyState>
      ) : filteredRuns.length === 0 ? (
        <EmptyState
          illustration={<NoMatchesIllustration size={70} />}
          title="No matching runs"
          description="Try adjusting your keyword search or status filter."
          className="history-empty-card"
          action={
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <div className="history-stack">
            {paginatedRuns.map((run) => {
              const time = new Date(run.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
              const dotClass = `dot dot-${run.status}`
              const isActive = run.id === activeRunId

              return (
                <div
                  key={run.id}
                  className={`run-card${isActive ? ' active' : ''}`}
                  onClick={() => handleSelect(run.id)}
                >
                  <div className="run-card-q" title={run.question}>
                    {renderHighlightedText(run.question, words)}
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
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <RotateCcw size={11} strokeWidth={2} /> Retry
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

          {/* ── Pagination Controls Bar ── */}
          {totalItems > 0 && (
            <div
              className="history-pagination-bar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 12,
                paddingTop: 10,
                borderTop: '1px solid var(--border)',
                fontSize: '11.5px',
                color: 'var(--text-dim)',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>
                  {startIndex + 1}–{endIndex} of {totalItems}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  style={{
                    background: 'var(--panel-alt)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--text)',
                    fontSize: '11px',
                    padding: '1px 4px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  aria-label="Runs per page"
                >
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage <= 1}
                  style={{ padding: '2px 5px', height: 24, fontSize: '11px' }}
                  title="First page"
                >
                  <ChevronsLeft size={12} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage <= 1}
                  style={{ padding: '2px 6px', height: 24, fontSize: '11px' }}
                  title="Previous page"
                >
                  <ChevronLeft size={12} />
                </button>

                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', padding: '0 4px' }}>
                  {validCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage >= totalPages}
                  style={{ padding: '2px 6px', height: 24, fontSize: '11px' }}
                  title="Next page"
                >
                  <ChevronRight size={12} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage >= totalPages}
                  style={{ padding: '2px 5px', height: 24, fontSize: '11px' }}
                  title="Last page"
                >
                  <ChevronsRight size={12} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
