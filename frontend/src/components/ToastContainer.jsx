import { useState, useEffect, useRef } from 'react'
import { useToast } from '../context/ToastContext'

function ToastCard({ toast, onDismiss }) {
  const [isPaused, setIsPaused] = useState(false)
  const [touchStartX, setTouchStartX] = useState(null)
  const [translateX, setTranslateX] = useState(0)
  const timerRef = useRef(null)
  const startTimeRef = useRef(Date.now())
  const remainingTimeRef = useRef(toast.duration || 3500)

  // ── Auto-dismiss timer with pause on hover ─────────────────
  useEffect(() => {
    if (toast.type === 'loading') return

    const startTimer = () => {
      startTimeRef.current = Date.now()
      timerRef.current = setTimeout(() => {
        onDismiss(toast.id)
      }, remainingTimeRef.current)
    }

    if (!isPaused) {
      startTimer()
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPaused, toast.id, toast.duration, toast.type, onDismiss])

  const handleMouseEnter = () => {
    if (toast.type === 'loading') return
    setIsPaused(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    const elapsed = Date.now() - startTimeRef.current
    remainingTimeRef.current = Math.max(500, remainingTimeRef.current - elapsed)
  }

  const handleMouseLeave = () => {
    if (toast.type === 'loading') return
    setIsPaused(false)
  }

  // ── Touch swipe-to-dismiss ─────────────────────────────────
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchMove = (e) => {
    if (touchStartX === null) return
    const diff = e.touches[0].clientX - touchStartX
    if (diff > 0) {
      setTranslateX(diff)
    }
  }

  const handleTouchEnd = () => {
    if (translateX > 70) {
      onDismiss(toast.id)
    } else {
      setTranslateX(0)
    }
    setTouchStartX(null)
  }

  // ── Status icon renderer ───────────────────────────────────
  const renderIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <span className="toast-icon toast-icon-success">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )
      case 'error':
        return (
          <span className="toast-icon toast-icon-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </span>
        )
      case 'warning':
        return (
          <span className="toast-icon toast-icon-warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
        )
      case 'loading':
        return (
          <span className="toast-icon toast-icon-loading">
            <span className="toast-spinner" />
          </span>
        )
      default:
        return (
          <span className="toast-icon toast-icon-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
        )
    }
  }

  return (
    <div
      className={`toast-card toast-${toast.type} animate-toast-in`}
      style={{
        transform: translateX > 0 ? `translateX(${translateX}px)` : undefined,
        opacity: translateX > 0 ? Math.max(0, 1 - translateX / 150) : undefined,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-content-wrapper">
        {renderIcon()}

        <div className="toast-text-group">
          {toast.title && <div className="toast-title">{toast.title}</div>}
          <div className="toast-message">
            {toast.message}
            {toast.count > 1 && (
              <span className="toast-count-pill" title={`Triggered ${toast.count} times`}>
                ×{toast.count}
              </span>
            )}
          </div>
        </div>

        {/* Action Button (e.g. Retry, Open link) */}
        {toast.action && (
          <button
            type="button"
            className="toast-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              toast.action.onClick()
              onDismiss(toast.id)
            }}
          >
            {toast.action.label}
          </button>
        )}

        <button
          type="button"
          className="toast-close-btn"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>

      {/* Progress countdown bar */}
      {toast.type !== 'loading' && (
        <div className="toast-progress-track">
          <div
            className={`toast-progress-fill toast-fill-${toast.type} ${isPaused ? 'paused' : ''}`}
            style={{
              animationDuration: `${toast.duration || 3500}ms`,
            }}
          />
        </div>
      )}
    </div>
  )
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (!toasts || toasts.length === 0) return null

  return (
    <div className="toast-container" aria-label="Notifications" role="region">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}

export default ToastContainer
