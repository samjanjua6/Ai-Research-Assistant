import { useState, useEffect, useCallback } from 'react'
import { shareRun } from '../api/client'
import { toast } from '../context/ToastContext'

export function ShareModal({ runId, question, onClose }) {
  const [loading, setLoading] = useState(true)
  const [isPublic, setIsPublic] = useState(true)
  const [shareToken, setShareToken] = useState(null)
  const [viewsCount, setViewsCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  // Fetch / initialize share link on modal open
  useEffect(() => {
    let mounted = true
    setLoading(true)
    shareRun(runId, true)
      .then((data) => {
        if (!mounted) return
        setShareToken(data.share_token)
        setIsPublic(data.is_public)
        setViewsCount(data.views_count || 0)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        setError(err.message || 'Failed to generate share link')
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [runId])

  const fullShareUrl = shareToken
    ? `${window.location.origin}/r/${shareToken}`
    : ''

  // ── Copy Link Handler ─────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!fullShareUrl) return
    navigator.clipboard.writeText(fullShareUrl).then(() => {
      setCopied(true)
      toast.success('Public report link copied to clipboard!', { title: '🔗 Link Copied' })
      setTimeout(() => setCopied(false), 2000)
    })
  }, [fullShareUrl])

  // ── Native Web Share API ──────────────────────────────────────
  const handleNativeShare = useCallback(() => {
    if (!navigator.share || !fullShareUrl) return
    navigator.share({
      title: `Research Report: ${question || 'AI Report'}`,
      text: `Read this AI research report on "${question || 'Research'}"`,
      url: fullShareUrl,
    }).catch(() => {})
  }, [fullShareUrl, question])

  // ── Toggle Public Status ──────────────────────────────────────
  const handleToggle = async (e) => {
    const nextState = e.target.checked
    setIsPublic(nextState)
    try {
      const data = await shareRun(runId, nextState)
      setIsPublic(data.is_public)
      toast.info(nextState ? 'Public link is active.' : 'Public link has been disabled.', {
        title: nextState ? '🌐 Public Sharing Enabled' : '🔒 Private Mode Active',
      })
    } catch {
      setIsPublic(!nextState)
      toast.error('Failed to update sharing settings', { title: '❌ Error' })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box share-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="modal-header">
          <div className="share-modal-title-group">
            <h3 id="share-modal-title" className="modal-title">
              Share Research Report
            </h3>
            <p className="share-modal-sub">
              Anyone with this link can view the full report, tables, and citations.
            </p>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="share-modal-body">
          {error && <div className="auth-error">{error}</div>}

          {loading ? (
            <div className="share-loading">
              <span className="pdf-spinner" />
              <span>Generating shareable link…</span>
            </div>
          ) : (
            <>
              {/* Toggle Public Sharing */}
              <div className="share-toggle-row">
                <div className="share-toggle-info">
                  <span className="share-toggle-title">Public Sharing</span>
                  <span className="share-toggle-desc">
                    {isPublic
                      ? 'Link is active and accessible to anyone.'
                      : 'Link is disabled. Only you can view this report.'}
                  </span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={handleToggle}
                  />
                  <span className="switch-track" />
                  <span className="switch-knob" />
                </label>
              </div>

              {/* Link Input & Copy Button */}
              {isPublic && (
                <div className="share-input-box">
                  <div className="share-input-group">
                    <input
                      type="text"
                      className="form-input share-url-input"
                      value={fullShareUrl}
                      readOnly
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      className="btn btn-primary share-copy-btn"
                      onClick={handleCopy}
                    >
                      {copied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>

                  <div className="share-actions-row">
                    {typeof navigator !== 'undefined' && navigator.share && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleNativeShare}
                      >
                        📤 Share via Apps…
                      </button>
                    )}
                    <a
                      href={fullShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      👁 Open Public View ↗
                    </a>
                    {viewsCount > 0 && (
                      <span className="share-views-badge">
                        👁 {viewsCount} {viewsCount === 1 ? 'view' : 'views'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShareModal
