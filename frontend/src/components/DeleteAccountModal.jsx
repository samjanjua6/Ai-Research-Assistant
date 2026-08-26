import { useState, useEffect } from 'react'
import { AlertTriangle, Trash2, Download, Eye, EyeOff, X, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

/**
 * DeleteAccountModal — High-security danger zone dialog with:
 *  1. Live account summary metrics (total runs to be erased).
 *  2. 1-Click GDPR JSON data export backup.
 *  3. Dual confirmation: Type exact email + enter current password.
 *  4. Cascade purge execution.
 */
export function DeleteAccountModal({ onClose, onDeleted }) {
  const { user, fetchAccountSummary, exportUserData, deleteAccount } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()

  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const clearError = () => setError(null)

  // Fetch account summary on mount
  useEffect(() => {
    fetchAccountSummary()
      .then(setSummary)
      .catch((err) => console.warn('Could not load account summary:', err))
      .finally(() => setSummaryLoading(false))
  }, [fetchAccountSummary])

  // Export JSON archive
  const handleExportData = async () => {
    setExporting(true)
    try {
      const data = await exportUserData()
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `research-assistant-data-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Downloaded complete research data export (.json)', { title: 'Export Complete' })
    } catch (err) {
      toastError(err.message || 'Failed to export data', { title: 'Export Failed' })
    } finally {
      setExporting(false)
    }
  }

  // Submit deletion
  const handleDeleteSubmit = async (e) => {
    e.preventDefault()
    if (confirmEmail.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase()) {
      setError('Please type your exact email address to confirm.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    clearError()
    try {
      await deleteAccount(password)
      toastSuccess('Your account and all associated research data have been permanently deleted.', {
        title: 'Account Deleted',
      })
      onDeleted?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to delete account')
      setLoading(false)
    }
  }

  const emailMatches =
    confirmEmail.trim().toLowerCase() === (user?.email || '').trim().toLowerCase()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box delete-account-modal animate-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Delete Account Confirmation"
        style={{
          maxWidth: 480,
          border: '1px solid rgba(239, 68, 68, 0.35)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 24px rgba(239, 68, 68, 0.12)',
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={18} strokeWidth={2.2} />
            </div>
            <h2 className="modal-title" style={{ color: '#ef4444' }}>
              Delete Account
            </h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Warning Banner */}
        <div
          style={{
            margin: '18px 0 14px',
            padding: '12px 14px',
            borderRadius: 8,
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            fontSize: '13px',
            color: 'var(--text)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: '#ef4444' }}>Warning:</strong> This action is{' '}
          <strong>permanent and irreversible</strong>. All your research syntheses,
          step logs, and shared links will be wiped immediately.
        </div>

        {/* Summary Info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--border)',
            fontSize: '12.5px',
            marginBottom: 16,
          }}
        >
          <div>
            <span style={{ color: 'var(--text-dim)' }}>Research runs to delete:</span>{' '}
            <strong style={{ color: 'var(--text)' }}>
              {summaryLoading ? '…' : summary?.runs_count ?? 0} runs
            </strong>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleExportData}
            disabled={exporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12px', padding: '4px 10px' }}
            title="Download JSON archive before deletion"
          >
            <Download size={12} strokeWidth={2} />
            <span>{exporting ? 'Exporting…' : 'Export Data (.json)'}</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="auth-error" role="alert" style={{ marginBottom: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} strokeWidth={2} /> {error}
            </span>
            <button className="auth-error-dismiss" onClick={clearError}>
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Confirmation Form */}
        <form className="auth-form" onSubmit={handleDeleteSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-email">
              Type your email (<span style={{ color: 'var(--violet)' }}>{user?.email}</span>) to confirm:
            </label>
            <input
              id="confirm-email"
              className="form-input"
              type="email"
              autoComplete="off"
              required
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={user?.email || 'you@example.com'}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="delete-password">
              Enter your password:
            </label>
            <div className="input-with-toggle">
              <input
                id="delete-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Current account password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              style={{ flex: 1 }}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading || !emailMatches || !password}
              style={{
                flex: 1.5,
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontWeight: 600,
              }}
            >
              {loading ? (
                'Purging account…'
              ) : (
                <>
                  <Trash2 size={14} strokeWidth={2} />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DeleteAccountModal
