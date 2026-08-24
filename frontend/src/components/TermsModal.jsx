import { useEffect, useState } from 'react'
import { fetchTerms } from '../api/client'

export function TermsModal({ onClose }) {
  const [terms, setTerms] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTerms()
      .then(setTerms)
      .catch(() => setError('Failed to load terms. Please try again.'))
  }, [])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box terms-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Terms of Service"
      >
        <div className="modal-header">
          <h2 className="modal-title">Terms of Service &amp; AI Usage Policy</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="terms-body">
          {error && <p className="auth-error">{error}</p>}
          {!terms && !error && <p className="terms-loading">Loading…</p>}
          {terms && (
            <>
              <p className="terms-meta">
                Version {terms.version} — Effective {terms.effective_date}
              </p>
              {terms.sections.map((s, i) => (
                <div key={i} className="terms-section">
                  <h3 className="terms-section-heading">{s.heading}</h3>
                  <p className="terms-section-body">{s.body}</p>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
