/**
 * API client — thin wrappers over fetch and EventSource.
 * BASE is empty in dev (Vite proxy handles routing to :8000).
 * In production the React build is served by FastAPI so relative URLs work too.
 */

const BASE = ''

// ── Auth token storage ────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem('auth_token')
}

export function setToken(token) {
  localStorage.setItem('auth_token', token)
}

export function clearToken() {
  localStorage.removeItem('auth_token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Auth endpoints ─────────────────────────────────────────────────

export async function sendSignupOtp({ name, email }) {
  const res = await fetch(`${BASE}/auth/send-signup-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function verifyOtpAndSignup({ name, email, password, terms_accepted, otp }) {
  const res = await fetch(`${BASE}/auth/verify-otp-and-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, terms_accepted, otp }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json() // { access_token, token_type, user }
}

export async function resendOtp({ name, email }) {
  const res = await fetch(`${BASE}/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function forgotPassword(email) {
  const res = await fetch(`${BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function resendForgotPasswordOtp(email) {
  const res = await fetch(`${BASE}/auth/resend-forgot-password-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function verifyResetCode({ email, otp }) {
  const res = await fetch(`${BASE}/auth/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function resetPassword({ email, otp, new_password }) {
  const res = await fetch(`${BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, new_password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json() // { access_token, token_type, user }
}

export async function signup({ name, email, password, terms_accepted }) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, terms_accepted }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json() // { access_token, token_type, user }
}

export async function login({ email, password }) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json() // { access_token, token_type, user }
}

export async function fetchMe() {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchAccountSummary() {
  const res = await fetch(`${BASE}/auth/account-summary`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function exportUserData() {
  const res = await fetch(`${BASE}/auth/export-data`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function deleteAccount(password) {
  const res = await fetch(`${BASE}/auth/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function changePassword({ current_password, new_password }) {
  const res = await fetch(`${BASE}/auth/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ current_password, new_password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json() // { access_token, token_type, user }
}

export async function fetchTerms() {
  const res = await fetch(`${BASE}/auth/terms`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── REST helpers ─────────────────────────────────────────────────

export async function startRun(question) {
  const res = await fetch(`${BASE}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json() // { run_id, status }
}

export async function listRuns() {
  const res = await fetch(`${BASE}/research`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getRun(runId) {
  const res = await fetch(`${BASE}/research/${runId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function stopRun(runId) {
  const res = await fetch(`${BASE}/research/${runId}/stop`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function shareRun(runId, isPublic = true) {
  const res = await fetch(`${BASE}/research/${runId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ is_public: isPublic }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json() // { share_token, share_url, is_public, views_count }
}

export async function fetchPublicReport(shareToken) {
  const res = await fetch(`${BASE}/public/reports/${encodeURIComponent(shareToken)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json() // { id, question, status, final_report, summary, sources, loop_count, created_at, views_count, author_name }
}

// ── SSE stream ───────────────────────────────────────────────────

export function openStream(runId, { onStep, onToken, onDone, onError }) {
  const token = getToken()
  const url = token
    ? `${BASE}/research/${runId}/stream?token=${encodeURIComponent(token)}`
    : `${BASE}/research/${runId}/stream`

  const es = new EventSource(url)

  es.addEventListener('step', (e) => {
    try { onStep(JSON.parse(e.data)) } catch (_) {}
  })

  es.addEventListener('token', (e) => {
    try { onToken?.(JSON.parse(e.data)) } catch (_) {}
  })

  es.addEventListener('done', (e) => {
    es.close()
    try { onDone(JSON.parse(e.data)) } catch (_) {}
  })

  es.onerror = () => {
    es.close()
    onError?.(new Error('Stream connection lost'))
  }

  return () => es.close()
}

// ── Admin API ─────────────────────────────────────────────────────

export async function fetchAdminOverview() {
  const res = await fetch(`${BASE}/admin/overview`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchAdminUsers({ search = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.append('search', search)

  const res = await fetch(`${BASE}/admin/users?${params.toString()}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function updateUserRole(userId, role) {
  const res = await fetch(`${BASE}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ role }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function adminDeleteUser(userId) {
  const res = await fetch(`${BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchAdminRuns({ search = '', status = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.append('search', search)
  if (status && status !== 'all') params.append('status_filter', status)

  const res = await fetch(`${BASE}/admin/runs?${params.toString()}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchAdminRunDetail(runId) {
  const res = await fetch(`${BASE}/admin/runs/${runId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchAdminServerMetrics() {
  const res = await fetch(`${BASE}/admin/server-metrics`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

