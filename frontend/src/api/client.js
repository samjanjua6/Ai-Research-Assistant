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

export async function startRun(questionOrPayload) {
  const body = typeof questionOrPayload === 'string'
    ? { question: questionOrPayload }
    : questionOrPayload

  const res = await fetch(`${BASE}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json() // { run_id, status }
}

export async function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BASE}/research/upload-doc`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to upload file (${res.status})`)
  }
  return res.json() // { id, filename, file_type, file_size, page_count, word_count, preview, ... }
}

export async function fetchUrlContext(url) {
  const res = await fetch(`${BASE}/research/fetch-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to fetch URL (${res.status})`)
  }
  return res.json() // { id, url, domain, title, word_count, preview, full_text, ... }
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

// ── Trending Topics endpoints ─────────────────────────────────────

export async function fetchTrendingTopics({ category = '', refresh = false, offset = 0, count = 4 } = {}) {
  const params = new URLSearchParams({ count, offset })
  if (category && category !== 'all') params.append('category', category)
  if (refresh) params.append('refresh', 'true')

  const res = await fetch(`${BASE}/research/trending-topics?${params.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchWildcardPrompt() {
  const res = await fetch(`${BASE}/research/trending-topics/wildcard`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Personal Usage & Research Analytics ───────────────────────────

export async function fetchUserAnalytics() {
  const res = await fetch(`${BASE}/research/analytics/me`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Research Library & Collections Hub ─────────────────────────────

export async function fetchLibraryRuns({
  search = '',
  collection_id = '',
  engine = '',
  lens = '',
  is_bookmarked = null,
  date_range = '',
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams({ limit, offset })
  if (search) params.append('search', search)
  if (collection_id && collection_id !== 'all') params.append('collection_id', collection_id)
  if (engine && engine !== 'all') params.append('engine', engine)
  if (lens && lens !== 'all') params.append('lens', lens)
  if (is_bookmarked !== null && is_bookmarked !== undefined) params.append('is_bookmarked', String(is_bookmarked))
  if (date_range && date_range !== 'all') params.append('date_range', date_range)

  const res = await fetch(`${BASE}/research/library?${params.toString()}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchCollections() {
  const res = await fetch(`${BASE}/research/library/collections`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function createCollection({ name, description = '', color = '#7c6af0', icon = 'Folder', is_smart = false, smart_rules = null }) {
  const res = await fetch(`${BASE}/research/library/collections`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, description, color, icon, is_smart, smart_rules }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function updateCollection(collectionId, data) {
  const res = await fetch(`${BASE}/research/library/collections/${collectionId}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function deleteCollection(collectionId) {
  const res = await fetch(`${BASE}/research/library/collections/${collectionId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function modifyCollectionRuns(collectionId, runIds, action = 'add') {
  const res = await fetch(`${BASE}/research/library/collections/${collectionId}/runs`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ run_ids: runIds, action }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function toggleRunBookmark(runId) {
  const res = await fetch(`${BASE}/research/library/runs/${runId}/bookmark`, {
    method: 'PATCH',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function updateRunTags(runId, tags) {
  const res = await fetch(`${BASE}/research/library/runs/${runId}/tags`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ tags }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function updateRunNotes(runId, notes) {
  const res = await fetch(`${BASE}/research/library/runs/${runId}/notes`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ notes }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function generateMasterDossier({ run_ids, title = '', focus = '' }) {
  const res = await fetch(`${BASE}/research/library/dossier`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ run_ids, title: title || null, focus: focus || null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function exportBibTeX(runIds) {
  const res = await fetch(`${BASE}/research/library/export/bibtex`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ run_ids: runIds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.text()
}

export async function exportCSV(runIds) {
  const res = await fetch(`${BASE}/research/library/export/csv`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ run_ids: runIds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.text()
}

// ── Interactive "Chat with Report" & Citation Verifier ──────────────

export async function fetchReportChatHistory(runId) {
  const res = await fetch(`${BASE}/research/${runId}/chat`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function sendReportChatMessageStream(runId, message, chatHistory, onToken, onDone, onError) {
  try {
    const res = await fetch(`${BASE}/research/${runId}/chat`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message, chat_history: chatHistory }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'token') {
              onToken?.(data.token)
            } else if (data.type === 'done') {
              onDone?.(data.sources_referenced || [])
            } else if (data.type === 'error') {
              onError?.(new Error(data.error || 'Chat stream error'))
            }
          } catch (e) {
            console.error('Failed to parse SSE line:', line, e)
          }
        }
      }
    }
  } catch (err) {
    onError?.(err)
  }
}

export async function clearReportChatHistory(runId) {
  const res = await fetch(`${BASE}/research/${runId}/chat`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function expandReportSection(runId, sectionTitle, sectionContent, action = 'elaborate') {
  const res = await fetch(`${BASE}/research/${runId}/expand-section`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      section_title: sectionTitle,
      section_content: sectionContent,
      action,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function explainTextSelection(runId, selectedText, action = 'eli5') {
  const res = await fetch(`${BASE}/research/${runId}/explain-selection`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      selected_text: selectedText,
      action,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function appendSectionToReport(runId, sectionTitle, additionContent) {
  const res = await fetch(`${BASE}/research/${runId}/append-section`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      section_title: sectionTitle,
      addition_content: additionContent,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchCitationDetails(runId, citationIndex) {
  const res = await fetch(`${BASE}/research/${runId}/citations/${citationIndex}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Public Discover Showcase & Fork Flywheel ───────────────────────

export async function fetchDiscoverFeed({ category = 'all', sortBy = 'trending', search = '', engine = 'all', limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (sortBy) params.set('sort_by', sortBy)
  if (search) params.set('search', search)
  if (engine) params.set('engine', engine)
  params.set('limit', String(limit))
  params.set('offset', String(offset))

  const res = await fetch(`${BASE}/public/discover/feed?${params.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchDiscoverStats() {
  const res = await fetch(`${BASE}/public/discover/stats`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function upvoteReport(runId, count = 1, action = 'like') {
  const res = await fetch(`${BASE}/public/discover/${runId}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, action }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function forkReportInquiry(runId, newLens, newQuestion) {
  const res = await fetch(`${BASE}/public/discover/${runId}/fork`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_lens: newLens, new_question: newQuestion }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

