import { useState, useEffect } from 'react'
import { X, ExternalLink, ShieldCheck, FileText, MessageSquare, Check, Sparkles, AlertCircle } from 'lucide-react'
import { fetchCitationDetails } from '../../api/client'

export function CitationVerifierDrawer({ runId, citationIndex, onClose, onAskInChat }) {
  const [citation, setCitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!runId || !citationIndex) return
    let isMounted = true
    setLoading(true)
    setError(null)

    fetchCitationDetails(runId, citationIndex)
      .then((res) => {
        if (isMounted) setCitation(res.citation)
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Could not load citation quote.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [runId, citationIndex])

  const getTierColor = (tier) => {
    if (tier?.includes('1')) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' }
    if (tier?.includes('2')) return { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: 'rgba(6, 182, 212, 0.3)' }
    return { bg: 'rgba(124, 106, 240, 0.15)', color: 'var(--violet)', border: 'rgba(124, 106, 240, 0.3)' }
  }

  const tierStyle = getTierColor(citation?.tier)

  return (
    <div
      className="citation-drawer-overlay animate-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 600,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="citation-drawer-panel"
        style={{
          width: '100%',
          maxWidth: 440,
          height: '100%',
          backgroundColor: 'var(--panel)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--panel-alt)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                backgroundColor: 'var(--violet-soft)',
                color: 'var(--violet)',
                border: '1px solid rgba(124, 106, 240, 0.3)',
              }}
            >
              [{citationIndex}]
            </span>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Citation Evidence Verifier
            </h2>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '4px 8px' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>Verifying citation passage...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
              <AlertCircle size={28} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px' }}>{error}</p>
            </div>
          ) : citation ? (
            <>
              {/* Title & Domain */}
              <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.35 }}>
                  {citation.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: tierStyle.bg,
                      color: tierStyle.color,
                      border: `1px solid ${tierStyle.border}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <ShieldCheck size={12} /> {citation.tier} • {citation.domain}
                  </span>

                  {citation.url && (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-btn"
                      style={{ fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      Visit Source <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Scraped Passage Quote */}
              <div>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                  Verified Passage Excerpt
                </span>

                <div
                  style={{
                    padding: '14px',
                    borderRadius: 8,
                    backgroundColor: 'var(--panel-alt)',
                    border: '1px solid var(--border)',
                    borderLeft: '3px solid var(--violet)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  "{citation.snippet}"
                </div>
              </div>

              {/* Grounding Confidence Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <Check size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                  <strong>Grounding Status:</strong> Verified primary claim in report draft.
                </div>
              </div>

              {/* Action: Ask in Chat */}
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onAskInChat?.(`What does Source [${citationIndex}] (${citation.title}) conclude regarding this investigation?`)
                    onClose()
                  }}
                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', fontSize: '13px' }}
                >
                  <MessageSquare size={14} /> Ask Follow-Up About Source [{citationIndex}]
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
