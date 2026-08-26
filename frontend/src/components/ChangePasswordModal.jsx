import { useState } from 'react'
import { KeyRound, Eye, EyeOff, X, AlertCircle, Check, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

/**
 * Calculates password strength score (0 to 4)
 */
function evaluatePasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score += 1
  if (pw.length >= 12) score += 1
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' }
  if (score <= 2) return { score: 2, label: 'Fair', color: '#f59e0b' }
  if (score <= 3) return { score: 3, label: 'Good', color: '#7c3aed' }
  return { score: 4, label: 'Strong', color: '#10b981' }
}

export function ChangePasswordModal({ onClose, onForgotPassword }) {
  const { user, changePassword } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const clearError = () => setError(null)

  const pwStrength = evaluatePasswordStrength(newPassword)
  const hasMinLength = newPassword.length >= 8
  const hasNumberOrSymbol = /[0-9]|[^A-Za-z0-9]/.test(newPassword)
  const isDifferentFromCurrent = newPassword && currentPassword && newPassword !== currentPassword
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword

  const canSubmit =
    currentPassword.length > 0 &&
    hasMinLength &&
    passwordsMatch &&
    (currentPassword ? isDifferentFromCurrent : true)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentPassword) {
      setError('Please enter your current password.')
      return
    }
    if (!hasMinLength) {
      setError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword === currentPassword) {
      setError('New password cannot be the same as your current password.')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    clearError()
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      toastSuccess('Password updated successfully! A security notice was sent to your email.', {
        title: 'Password Changed',
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update password')
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box auth-modal change-password-modal animate-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Change Password"
        style={{ maxWidth: 460 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'rgba(124, 106, 240, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--violet)',
                flexShrink: 0,
              }}
            >
              <KeyRound size={17} strokeWidth={2} />
            </div>
            <h2 className="modal-title">Change Password</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Subtitle notice */}
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '14px 0 16px', lineHeight: 1.5 }}>
          Update the password for <strong style={{ color: 'var(--text)' }}>{user?.email}</strong>. A security confirmation email will be sent automatically.
        </p>

        {/* Error banner */}
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

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Current password */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="form-label" htmlFor="current-password" style={{ margin: 0 }}>
                Current Password
              </label>
              {onForgotPassword && (
                <button
                  type="button"
                  className="link-btn text-xs"
                  onClick={() => {
                    onClose()
                    onForgotPassword()
                  }}
                  style={{ fontSize: '12px', color: 'var(--violet)' }}
                >
                  Forgot current password?
                </button>
              )}
            </div>

            <div className="input-with-toggle">
              <input
                id="current-password"
                className="form-input"
                type={showCurrentPw ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoFocus
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowCurrentPw((s) => !s)}
                aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
              >
                {showCurrentPw ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="form-group">
            <label className="form-label" htmlFor="change-new-password">
              New Password <span className="form-hint">(min 8 characters)</span>
            </label>
            <div className="input-with-toggle">
              <input
                id="change-new-password"
                className="form-input"
                type={showNewPw ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Choose a strong new password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowNewPw((s) => !s)}
                aria-label={showNewPw ? 'Hide password' : 'Show password'}
              >
                {showNewPw ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {newPassword && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', gap: 4, height: 4, borderRadius: 2, overflow: 'hidden' }}>
                  {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          style={{
                            flex: 1,
                            backgroundColor: level <= pwStrength.score ? pwStrength.color : 'var(--border)',
                            transition: 'background-color 0.2s',
                          }}
                        />
                      ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: 3 }}>
                  <span style={{ color: pwStrength.color, fontWeight: 600 }}>{pwStrength.label}</span>
                  <span style={{ color: 'var(--text-dim)' }}>
                    {newPassword.length >= 8 ? '8+ chars' : `${8 - newPassword.length} more chars needed`}
                  </span>
                </div>
              </div>
            )}

            {/* Live Requirement Checklist Badges */}
            {newPassword && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 8,
                  fontSize: '11px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '2px 7px',
                    borderRadius: 4,
                    backgroundColor: hasMinLength ? 'rgba(16, 185, 129, 0.12)' : 'var(--panel-alt)',
                    color: hasMinLength ? '#10b981' : 'var(--text-dim)',
                    border: `1px solid ${hasMinLength ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                  }}
                >
                  {hasMinLength ? <Check size={10} strokeWidth={2.5} /> : '•'} 8+ chars
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '2px 7px',
                    borderRadius: 4,
                    backgroundColor: hasNumberOrSymbol ? 'rgba(16, 185, 129, 0.12)' : 'var(--panel-alt)',
                    color: hasNumberOrSymbol ? '#10b981' : 'var(--text-dim)',
                    border: `1px solid ${hasNumberOrSymbol ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                  }}
                >
                  {hasNumberOrSymbol ? <Check size={10} strokeWidth={2.5} /> : '•'} Numbers/symbols
                </span>

                {currentPassword && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '2px 7px',
                      borderRadius: 4,
                      backgroundColor: isDifferentFromCurrent ? 'rgba(16, 185, 129, 0.12)' : 'var(--panel-alt)',
                      color: isDifferentFromCurrent ? '#10b981' : 'var(--text-dim)',
                      border: `1px solid ${isDifferentFromCurrent ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                    }}
                  >
                    {isDifferentFromCurrent ? <Check size={10} strokeWidth={2.5} /> : '•'} Different from old
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Confirm new password */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="form-label" htmlFor="confirm-change-password" style={{ margin: 0 }}>
                Confirm New Password
              </label>
              {passwordsMatch && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                  <Check size={12} strokeWidth={2.5} /> Match
                </span>
              )}
            </div>
            <div className="input-with-toggle">
              <input
                id="confirm-change-password"
                className="form-input"
                type={showConfirmPw ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowConfirmPw((s) => !s)}
                aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
              >
                {showConfirmPw ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
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
              className="btn btn-primary"
              disabled={loading || !canSubmit}
              style={{
                flex: 1.5,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {loading ? (
                'Updating password…'
              ) : (
                <>
                  <span>Update Password</span>
                  <ArrowRight size={14} strokeWidth={2} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordModal
