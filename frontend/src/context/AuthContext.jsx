import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  signup as apiSignup,
  sendSignupOtp as apiSendSignupOtp,
  verifyOtpAndSignup as apiVerifyOtpAndSignup,
  resendOtp as apiResendOtp,
  forgotPassword as apiForgotPassword,
  resendForgotPasswordOtp as apiResendForgotPasswordOtp,
  verifyResetCode as apiVerifyResetCode,
  resetPassword as apiResetPassword,
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

  // ── signup with OTP ───────────────────────────────────────────
  const sendSignupOtp = useCallback(async ({ name, email }) => {
    return await apiSendSignupOtp({ name, email })
  }, [])

  const verifyOtpAndSignup = useCallback(async ({ name, email, password, terms_accepted, otp }) => {
    const data = await apiVerifyOtpAndSignup({ name, email, password, terms_accepted, otp })
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const resendOtp = useCallback(async ({ name, email }) => {
    return await apiResendOtp({ name, email })
  }, [])

  // ── password reset ────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    return await apiForgotPassword(email)
  }, [])

  const resendForgotPasswordOtp = useCallback(async (email) => {
    return await apiResendForgotPasswordOtp(email)
  }, [])

  const verifyResetCode = useCallback(async ({ email, otp }) => {
    return await apiVerifyResetCode({ email, otp })
  }, [])

  const resetPassword = useCallback(async ({ email, otp, new_password }) => {
    const data = await apiResetPassword({ email, otp, new_password })
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  // ── direct signup fallback ────────────────────────────────────
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

  const value = {
    user,
    loading,
    login,
    signup,
    sendSignupOtp,
    verifyOtpAndSignup,
    resendOtp,
    forgotPassword,
    resendForgotPasswordOtp,
    verifyResetCode,
    resetPassword,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
