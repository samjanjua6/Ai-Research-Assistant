import { useState, useEffect } from 'react'
import { Eye, EyeOff, AlertCircle, X, ArrowRight, ArrowLeft, KeyRound, Check, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { TermsModal } from './TermsModal'
import { OtpInput } from './OtpInput'

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

/**
 * AuthModal — Sign In, Signup with OTP, and 1-Click / OTP Password Reset.
 */
export function AuthModal({
  onClose,
  onSuccess,
  defaultTab = 'login',
  initialEmail = '',
  initialResetCode = '',
}) {
  const {
    login,
    sendSignupOtp,
    verifyOtpAndSignup,
    resendOtp,
    forgotPassword,
    resendForgotPasswordOtp,
    resetPassword,
  } = useAuth()

  const { success: toastSuccess, info: toastInfo, error: toastError } = useToast()

  // Views: 'auth' (Sign in / Signup tabs) | 'forgot_email' | 'forgot_reset'
  const [view, setView] = useState(initialResetCode ? 'forgot_reset' : 'auth')
  const [tab, setTab] = useState(defaultTab)
  const [signupStep, setSignupStep] = useState('form') // 'form' | 'otp'

  // Login state
  const [loginEmail, setLoginEmail] = useState(initialEmail || '')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)

  // Signup state
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState(initialEmail || '')
  const [signupPassword, setSignupPassword] = useState('')
  const [showSignupPw, setShowSignupPw] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Forgot password state
  const [resetEmail, setResetEmail] = useState(initialEmail || '')
  const [resetOtp, setResetOtp] = useState(initialResetCode || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showTerms, setShowTerms] = useState(false)

  const clearError = () => setError(null)

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // ── Login submit ─────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    clearError()
    try {
      const user = await login({ email: loginEmail, password: loginPassword })
      toastSuccess(`Welcome back, ${user.name}!`, { title: 'Signed In' })
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
      toastInfo(`Verification code sent to ${signupEmail}`, { title: 'Check Your Email' })
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
        title: 'Account Created',
      })
      onSuccess?.(user)
    } catch (err) {
      setError(err.message)
      toastError(err.message || 'Invalid verification code', { title: 'Verification Failed' })
    } finally {
      setLoading(false)
    }
  }

  // ── Resend Signup OTP ────────────────────────────────────────
  async function handleResendOtp() {
    clearError()
    try {
      await resendOtp({
        name: signupName,
        email: signupEmail,
      })
      toastInfo(`New verification code sent to ${signupEmail}`, { title: 'Code Resent' })
    } catch (err) {
      setError(err.message)
      toastError(err.message, { title: 'Resend Failed' })
    }
  }

  // ── Forgot Password Step 1: Request Reset Code ─────────────────
  async function handleSendResetCode(e) {
    e.preventDefault()
    if (!resetEmail.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    clearError()
    try {
      await forgotPassword(resetEmail.trim())
      setView('forgot_reset')
      setResendCooldown(60)
      toastInfo(`If an account exists, a reset code was sent to ${resetEmail}`, {
        title: 'Reset Code Sent',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Resend Reset OTP ─────────────────────────────────────────
  async function handleResendResetCode() {
    if (resendCooldown > 0) return
    clearError()
    try {
      await resendForgotPasswordOtp(resetEmail.trim())
      setResendCooldown(60)
      toastInfo(`A new password reset code was sent to ${resetEmail}`, { title: 'Code Resent' })
    } catch (err) {
      setError(err.message)
      toastError(err.message, { title: 'Resend Failed' })
    }
  }

  // ── Forgot Password Step 2: Set New Password & Auto Login ────
  async function handleResetPasswordSubmit(e) {
    e.preventDefault()
    if (resetOtp.trim().length !== 6) {
      setError('Please enter the full 6-digit reset code.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    clearError()
    try {
      const user = await resetPassword({
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        new_password: newPassword,
      })
      toastSuccess(`Password reset successfully! Welcome back, ${user.name}!`, {
        title: 'Password Updated',
      })
      onSuccess?.(user)
    } catch (err) {
      setError(err.message)
      toastError(err.message || 'Password reset failed', { title: 'Reset Failed' })
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (newTab) => {
    setTab(newTab)
    setView('auth')
    setSignupStep('form')
    clearError()
  }

  const pwStrength = evaluatePasswordStrength(newPassword)
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-box auth-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={
            view === 'forgot_email' || view === 'forgot_reset'
              ? 'Reset Password'
              : tab === 'login'
              ? 'Sign In'
              : 'Create Account'
          }
        >
          {/* Header */}
          <div className="modal-header">
            <h2 className="modal-title">
              {view === 'forgot_email'
                ? 'Forgot Password'
                : view === 'forgot_reset'
                ? 'Set New Password'
                : tab === 'login'
                ? 'Welcome back'
                : signupStep === 'otp'
                ? 'Verify Email'
                : 'Create your account'}
            </h2>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Tabs (only visible on main auth form) */}
          {view === 'auth' && signupStep === 'form' && (
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

          {/* Error banner */}
          {error && signupStep === 'form' && (
            <div className="auth-error" role="alert">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} strokeWidth={2} /> {error}
              </span>
              <button className="auth-error-dismiss" onClick={clearError}>
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── 1. Sign In Form ─────────────────────────────────────── */}
          {/* ════════════════════════════════════════════════════════════ */}
          {view === 'auth' && tab === 'login' && (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>
                    Password
                  </label>
                  <button
                    type="button"
                    className="link-btn text-xs"
                    onClick={() => {
                      setResetEmail(loginEmail)
                      setView('forgot_email')
                      clearError()
                    }}
                    style={{ fontSize: '12px', color: 'var(--violet)' }}
                  >
                    Forgot password?
                  </button>
                </div>

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
                    {showLoginPw ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
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

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── 2. Signup Form: Step 1 (Details) ────────────────────── */}
          {/* ════════════════════════════════════════════════════════════ */}
          {view === 'auth' && tab === 'signup' && signupStep === 'form' && (
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
                    {showSignupPw ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
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
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {loading ? 'Sending verification code…' : (
                  <>
                    <span>Continue</span>
                    <ArrowRight size={14} strokeWidth={2} />
                  </>
                )}
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

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── 3. Signup Form: Step 2 (OTP) ─────────────────────────── */}
          {/* ════════════════════════════════════════════════════════════ */}
          {view === 'auth' && tab === 'signup' && signupStep === 'otp' && (
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

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── 4. Forgot Password: Step 1 (Enter Email) ─────────────── */}
          {/* ════════════════════════════════════════════════════════════ */}
          {view === 'forgot_email' && (
            <form className="auth-form animate-in" onSubmit={handleSendResetCode}>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(124, 106, 240, 0.12)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--violet)',
                    marginBottom: 10,
                  }}
                >
                  <KeyRound size={20} strokeWidth={2} />
                </div>
                <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
                  Enter your registered email address and we&apos;ll send you a 6-digit recovery code and instant reset link.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reset-email">
                  Email address
                </label>
                <input
                  id="reset-email"
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                />
              </div>

              <button
                className="btn btn-primary btn-full"
                type="submit"
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {loading ? 'Sending reset code…' : (
                  <>
                    <span>Send Reset Code</span>
                    <ArrowRight size={14} strokeWidth={2} />
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setView('auth')
                    setTab('login')
                    clearError()
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '13px' }}
                >
                  <ArrowLeft size={13} strokeWidth={2} /> Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── 5. Forgot Password: Step 2 (Enter OTP + New Password) ─── */}
          {/* ════════════════════════════════════════════════════════════ */}
          {view === 'forgot_reset' && (
            <form className="auth-form animate-in" onSubmit={handleResetPasswordSubmit}>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981',
                    marginBottom: 8,
                  }}
                >
                  <ShieldCheck size={20} strokeWidth={2} />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
                  Enter the 6-digit code sent to <strong style={{ color: 'var(--text)' }}>{resetEmail}</strong> and choose a new password.
                </p>
              </div>

              {/* 6-digit OTP code input */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" htmlFor="reset-otp" style={{ margin: 0 }}>
                    6-Digit Reset Code
                  </label>
                  <button
                    type="button"
                    className="link-btn text-xs"
                    onClick={handleResendResetCode}
                    disabled={resendCooldown > 0}
                    style={{ fontSize: '12px' }}
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </div>
                <input
                  id="reset-otp"
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '18px',
                    letterSpacing: '4px',
                    textAlign: 'center',
                  }}
                  autoFocus
                />
              </div>

              {/* New password */}
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">
                  New Password <span className="form-hint">(min 8 characters)</span>
                </label>
                <div className="input-with-toggle">
                  <input
                    id="new-password"
                    className="form-input"
                    type={showNewPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
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
              </div>

              {/* Confirm password */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" htmlFor="confirm-password" style={{ margin: 0 }}>
                    Confirm New Password
                  </label>
                  {passwordsMatch && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '11.5px', color: '#10b981', fontWeight: 600 }}>
                      <Check size={12} strokeWidth={2.5} /> Match
                    </span>
                  )}
                </div>
                <input
                  id="confirm-password"
                  className="form-input"
                  type={showNewPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>

              <button
                className="btn btn-primary btn-full"
                type="submit"
                disabled={loading || !passwordsMatch || newPassword.length < 8}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}
              >
                {loading ? 'Resetting password…' : (
                  <>
                    <span>Reset Password &amp; Sign In</span>
                    <ArrowRight size={14} strokeWidth={2} />
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setView('auth')
                    setTab('login')
                    clearError()
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '13px' }}
                >
                  <ArrowLeft size={13} strokeWidth={2} /> Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Terms overlay */}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </>
  )
}

export default AuthModal
