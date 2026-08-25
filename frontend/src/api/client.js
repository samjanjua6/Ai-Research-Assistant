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

/**
 * Open an SSE stream for a run.
 * Token is appended as ?token= because EventSource cannot set headers.
 * Returns a cleanup function — call it to close the stream.
 *
 * @param {string} runId
 * @param {{ onStep: Function, onDone: Function, onError: Function }} handlers
 * @returns {() => void} cleanup
 */
export function openStream(runId, { onStep, onDone, onError }) {
  const token = getToken()
  const url = token
    ? `${BASE}/research/${runId}/stream?token=${encodeURIComponent(token)}`
    : `${BASE}/research/${runId}/stream`

  const es = new EventSource(url)

  es.addEventListener('step', (e) => {
    try { onStep(JSON.parse(e.data)) } catch (_) {}
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
