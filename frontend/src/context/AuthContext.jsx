import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  signup as apiSignup,
  login as apiLogin,
  fetchMe,
  getToken,
  setToken,
  clearToken,
} from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while checking existing session

  // ── Restore session on app start ──────────────────────────────
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => {
        // Token is expired/invalid — clear it
        clearToken()
      })
      .finally(() => setLoading(false))
  }, [])

  // ── login ─────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    const data = await apiLogin({ email, password })
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  // ── signup ────────────────────────────────────────────────────
  const signup = useCallback(async ({ name, email, password, terms_accepted }) => {
    const data = await apiSignup({ name, email, password, terms_accepted })
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  // ── logout ────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = { user, loading, login, signup, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
