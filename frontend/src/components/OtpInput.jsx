import { useState, useRef, useEffect } from 'react'
import { Mail, Edit3, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'

/**
 * OtpInput — Interactive 6-box numeric verification code component.
 * Features auto-advance, backspace navigation, paste detection, and 60s countdown timer.
 */
export function OtpInput({
  email,
  onVerify,
  onResend,
  onBack,
  loading = false,
  error = null,
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [resendCooldown, setResendCooldown] = useState(60)
  const inputRefs = useRef([])

  // ── Auto-focus first input on mount ──────────────────────────
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  // ── 60-second countdown timer ────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // ── Handle individual digit change ───────────────────────────
  const handleChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '').slice(-1)

    const nextDigits = [...digits]
    nextDigits[index] = cleanValue
    setDigits(nextDigits)

    // Auto-advance to next box if digit was typed
    if (cleanValue && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus()
    }

    // Auto-submit if all 6 digits are filled
    const fullCode = nextDigits.join('')
    if (fullCode.length === 6 && nextDigits.every((d) => d !== '')) {
      onVerify(fullCode)
    }
  }

  // ── Handle backspace navigation ──────────────────────────────
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        // Move back and clear previous box
        inputRefs.current[index - 1].focus()
        const nextDigits = [...digits]
        nextDigits[index - 1] = ''
        setDigits(nextDigits)
      } else {
        const nextDigits = [...digits]
        nextDigits[index] = ''
        setDigits(nextDigits)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // ── Handle full clipboard paste ──────────────────────────────
  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6)
    if (!pastedData) return

    const nextDigits = [...digits]
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pastedData[i] || ''
    }
    setDigits(nextDigits)

    // Focus last filled box or 6th box
    const focusIndex = Math.min(pastedData.length, 5)
    inputRefs.current[focusIndex]?.focus()

    if (pastedData.length === 6) {
      onVerify(pastedData)
    }
  }

  // ── Handle resend ────────────────────────────────────────────
  const handleResendClick = async () => {
    if (resendCooldown > 0 || loading) return
    setResendCooldown(60)
    setDigits(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
    await onResend?.()
  }

  const isComplete = digits.every((d) => d !== '')

  return (
    <div className="otp-container animate-in">
      <div className="otp-header">
        <div className="otp-icon-badge">
          <Mail size={28} strokeWidth={1.75} />
        </div>
        <h3 className="otp-title">Verify your email</h3>
        <p className="otp-subtitle">
          We’ve sent a 6-digit verification code to
        </p>
        <div className="otp-email-badge">
          <span>{email}</span>
          {onBack && (
            <button
              type="button"
              className="otp-edit-email-btn"
              onClick={onBack}
              title="Change email address"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}
            >
              <Edit3 size={11} strokeWidth={2} /> Edit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="auth-error" role="alert" style={{ marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} strokeWidth={2} /> {error}
          </span>
        </div>
      )}

      {/* 6-box input */}
      <div className="otp-boxes-row" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`otp-box ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}
            autoComplete="one-time-code"
            aria-label={`Digit ${index + 1}`}
            disabled={loading}
          />
        ))}
      </div>

      {/* Submit Button */}
      <button
        type="button"
        className="btn btn-primary otp-verify-btn"
        onClick={() => onVerify(digits.join(''))}
        disabled={!isComplete || loading}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        {loading ? (
          <>
            <span className="btn-spinner" /> Verifying…
          </>
        ) : (
          <>
            <span>Verify & Create Account</span>
            <ArrowRight size={14} strokeWidth={2} />
          </>
        )}
      </button>

      {/* Resend Cooldown Footer */}
      <div className="otp-footer">
        <span className="otp-resend-text">Didn't receive the code?</span>
        {resendCooldown > 0 ? (
          <span className="otp-countdown">
            Resend code in <b>{resendCooldown}s</b>
          </span>
        ) : (
          <button
            type="button"
            className="otp-resend-btn"
            onClick={handleResendClick}
            disabled={loading}
          >
            Resend verification code
          </button>
        )}
      </div>

      {onBack && (
        <button
          type="button"
          className="otp-back-btn"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <ArrowLeft size={12} strokeWidth={2} /> Back to details
        </button>
      )}
    </div>
  )
}

export default OtpInput
