import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
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
            <CheckCircle2 size={16} strokeWidth={2.2} />
          </span>
        )
      case 'error':
        return (
          <span className="toast-icon toast-icon-error">
            <AlertCircle size={16} strokeWidth={2.2} />
          </span>
        )
      case 'warning':
        return (
          <span className="toast-icon toast-icon-warning">
            <AlertTriangle size={16} strokeWidth={2.2} />
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
            <Info size={16} strokeWidth={2.2} />
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
          <X size={14} strokeWidth={2} />
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
