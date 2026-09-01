import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

// Global reference for calling toast from non-React utility functions
let globalToastRef = null

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toastsRef = useRef(toasts)
  toastsRef.current = toasts

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toastData) => {
    const id = toastData.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const duration = typeof toastData.duration === 'number' ? toastData.duration : 3500

    setToasts((prev) => {
      // Deduplicate: check if identical message already exists
      const existingIdx = prev.findIndex(
        (t) => t.message === toastData.message && t.type === toastData.type
      )

      if (existingIdx !== -1) {
        // Refresh existing toast and restart timer
        const updated = [...prev]
        updated[existingIdx] = {
          ...updated[existingIdx],
          ...toastData,
          id: updated[existingIdx].id,
          createdAt: Date.now(),
          count: (updated[existingIdx].count || 1) + 1,
        }
        return updated
      }

      let rawMsg = toastData.message
      let msgStr = ''
      if (typeof rawMsg === 'string') {
        msgStr = rawMsg
      } else if (rawMsg instanceof Error) {
        msgStr = rawMsg.message
      } else if (rawMsg && typeof rawMsg === 'object') {
        msgStr = rawMsg.detail || rawMsg.message || rawMsg.error || JSON.stringify(rawMsg)
      } else {
        msgStr = String(rawMsg || '')
      }

      const newToast = {
        id,
        type: toastData.type || 'info',
        title: toastData.title,
        message: msgStr,
        action: toastData.action, // { label: string, onClick: func }
        duration,
        createdAt: Date.now(),
        count: 1,
      }

      // Limit max 4 toasts on screen
      const trimmed = prev.length >= 4 ? prev.slice(prev.length - 3) : prev
      return [...trimmed, newToast]
    })

    return id
  }, [])

  const updateToast = useCallback((id, updates) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, createdAt: Date.now() } : t))
    )
  }, [])

  // ── Helper methods ──────────────────────────────────────────
  const success = useCallback(
    (message, options = {}) => {
      return addToast({ type: 'success', message, ...options })
    },
    [addToast]
  )

  const error = useCallback(
    (message, options = {}) => {
      return addToast({ type: 'error', message, duration: 4500, ...options })
    },
    [addToast]
  )

  const info = useCallback(
    (message, options = {}) => {
      return addToast({ type: 'info', message, ...options })
    },
    [addToast]
  )

  const warning = useCallback(
    (message, options = {}) => {
      return addToast({ type: 'warning', message, duration: 4000, ...options })
    },
    [addToast]
  )

  const promise = useCallback(
    async (promiseInstance, { loading = 'Loading…', success: successMsg, error: errorMsg }) => {
      const toastId = addToast({
        type: 'loading',
        message: typeof loading === 'string' ? loading : 'Processing…',
        duration: 60000, // keep until resolved
      })

      try {
        const result = await promiseInstance
        const finalSuccess =
          typeof successMsg === 'function' ? successMsg(result) : successMsg || 'Success!'
        updateToast(toastId, {
          type: 'success',
          message: finalSuccess,
          duration: 3500,
        })
        return result
      } catch (err) {
        const finalError =
          typeof errorMsg === 'function' ? errorMsg(err) : errorMsg || err.message || 'Action failed'
        updateToast(toastId, {
          type: 'error',
          message: finalError,
          duration: 4500,
        })
        throw err
      }
    },
    [addToast, updateToast]
  )

  const toastMethods = {
    addToast,
    dismiss,
    success,
    error,
    info,
    warning,
    promise,
  }

  // Update global ref
  globalToastRef = toastMethods

  return (
    <ToastContext.Provider value={{ toasts, ...toastMethods }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Return safe fallback or globalToastRef if used outside provider
    return (
      globalToastRef || {
        success: () => {},
        error: () => {},
        info: () => {},
        warning: () => {},
        promise: () => {},
        dismiss: () => {},
      }
    )
  }
  return context
}

// Global toast helper for utility files
export const toast = {
  success: (msg, opts) => globalToastRef?.success(msg, opts),
  error: (msg, opts) => globalToastRef?.error(msg, opts),
  info: (msg, opts) => globalToastRef?.info(msg, opts),
  warning: (msg, opts) => globalToastRef?.warning(msg, opts),
  promise: (p, opts) => globalToastRef?.promise(p, opts),
  dismiss: (id) => globalToastRef?.dismiss(id),
}
