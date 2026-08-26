import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { TermsModal } from './TermsModal'
import { OtpInput } from './OtpInput'

/**
 * AuthModal — Sign In / Create Account tabs with Email OTP verification.
 *
 * Props:
 *   onClose()           — called when modal is dismissed
 *   onSuccess(user)     — called after successful auth
 *   defaultTab          — 'login' | 'signup'
 */
export function AuthModal({ onClose, onSuccess, defaultTab = 'login' }) {
  const { login, sendSignupOtp, verifyOtpAndSignup, resendOtp } = useAuth()
  const { success: toastSuccess, info: toastInfo, error: toastError } = useToast()
  const [tab, setTab] = useState(defaultTab)
  const [signupStep, setSignupStep] = useState('form') // 'form' | 'otp'

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)

  // Signup form state
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [showSignupPw, setShowSignupPw] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showTerms, setShowTerms] = useState(false)

  const clearError = () => setError(null)

  // ── Login submit ─────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    clearError()
    try {
      const user = await login({ email: loginEmail, password: loginPassword })
      toastSuccess(`Welcome back, ${user.name}!`, { title: '✨ Signed In' })
      onSuccess?.(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1: Send Signup OTP ──────────────────────────────────
  async function handleSendSignupOtp(e) {
    e.preventDefault()
    if (!termsAccepted) {
      setError('You must accept the Terms of Service to create an account.')
      return
    }
    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)
    clearError()
    try {
      await sendSignupOtp({
        name: signupName,
        email: signupEmail,
      })
      setSignupStep('otp')
      toastInfo(`Verification code sent to ${signupEmail}`, { title: '📬 Check Your Email' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Verify OTP & Complete Signup ──────────────────────
  async function handleVerifyOtp(otpCode) {
    setLoading(true)
    clearError()
    try {
      const user = await verifyOtpAndSignup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        terms_accepted: termsAccepted,
        otp: otpCode,
      })
      toastSuccess(`Account created & email verified! Welcome, ${user.name}!`, {
        title: '🎉 Account Created',
      })
      onSuccess?.(user)
    } catch (err) {
      setError(err.message)
      toastError(err.message || 'Invalid verification code', { title: '❌ Verification Failed' })
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ───────────────────────────────────────────────
  async function handleResendOtp() {
    clearError()
    try {
      await resendOtp({
        name: signupName,
        email: signupEmail,
      })
      toastInfo(`New verification code sent to ${signupEmail}`, { title: '📬 Code Resent' })
    } catch (err) {
      setError(err.message)
      toastError(err.message, { title: '❌ Resend Failed' })
    }
  }

  const handleTabChange = (newTab) => {
    setTab(newTab)
    setSignupStep('form')
    clearError()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-box auth-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={tab === 'login' ? 'Sign In' : 'Create Account'}
        >
          {/* Header */}
          <div className="modal-header">
            <h2 className="modal-title">
              {tab === 'login'
                ? 'Welcome back'
                : signupStep === 'otp'
                ? 'Verify Email'
                : 'Create your account'}
            </h2>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          {/* Tabs (only visible on step 1) */}
          {signupStep === 'form' && (
            <div className="auth-tabs">
              <button
                className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                onClick={() => handleTabChange('login')}
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
                onClick={() => handleTabChange('signup')}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Error banner (on form view) */}
          {error && signupStep === 'form' && (
            <div className="auth-error" role="alert">
              <span>⚠ {error}</span>
              <button className="auth-error-dismiss" onClick={clearError}>
                ✕
              </button>
            </div>
          )}

          {/* ── Login form ── */}
          {tab === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  Email address
                </label>
                <input
                  id="login-email"
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  Password
                </label>
                <div className="input-with-toggle">
                  <input
                    id="login-password"
                    className="form-input"
                    type={showLoginPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowLoginPw((s) => !s)}
                    aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              <p className="auth-switch">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => handleTabChange('signup')}
                >
                  Create one
                </button>
              </p>
            </form>
          )}

          {/* ── Signup: Step 1 (Details Form) ── */}
          {tab === 'signup' && signupStep === 'form' && (
            <form className="auth-form" onSubmit={handleSendSignupOtp}>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-name">
                  Full name
                </label>
                <input
                  id="signup-name"
                  className="form-input"
                  type="text"
                  autoComplete="name"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="signup-email">
                  Email address
                </label>
                <input
                  id="signup-email"
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="signup-password">
                  Password <span className="form-hint">(min 8 characters)</span>
                </label>
                <div className="input-with-toggle">
                  <input
                    id="signup-password"
                    className="form-input"
                    type={showSignupPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Choose a strong password"
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowSignupPw((s) => !s)}
                    aria-label={showSignupPw ? 'Hide password' : 'Show password'}
                  >
                    {showSignupPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div className="form-group terms-check-group">
                <label className="terms-check-label">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setShowTerms(true)}
                    >
                      Terms of Service &amp; AI Usage Policy
                    </button>
                  </span>
                </label>
              </div>

              <button
                className="btn btn-primary btn-full"
                type="submit"
                disabled={loading || !termsAccepted}
              >
                {loading ? 'Sending verification code…' : 'Continue →'}
              </button>

              <p className="auth-switch">
                Already have an account?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => handleTabChange('login')}
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* ── Signup: Step 2 (OTP Verification) ── */}
          {tab === 'signup' && signupStep === 'otp' && (
            <OtpInput
              email={signupEmail}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onBack={() => {
                setSignupStep('form')
                clearError()
              }}
              loading={loading}
              error={error}
            />
          )}
        </div>
      </div>

      {/* Terms overlay — rendered on top of auth modal */}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </>
  )
}

export default AuthModal
