import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShieldCheck,
  Users,
  FileText,
  Activity,
  BarChart3,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowLeft,
  Eye,
  Trash2,
  Share2,
  HardDrive,
  Cpu,
  Server,
  Zap,
  Mail,
  UserCheck,
  UserX,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Database,
  X,
  Check,
} from 'lucide-react'
import {
  fetchAdminOverview,
  fetchAdminUsers,
  updateUserRole,
  adminDeleteUser,
  fetchAdminRuns,
  fetchAdminRunDetail,
  fetchAdminServerMetrics,
} from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ThemeToggle } from '../ThemeToggle'
import { LogoMark } from '../brand/Logo'
import { marked } from 'marked'

/**
 * Format uptime seconds into human-readable string (e.g. "3d 4h 12m")
 */
function formatUptime(seconds) {
  if (!seconds) return '0s'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Format ISO date string into relative or short readable string
 */
function formatDate(isoStr) {
  if (!isoStr) return 'N/A'
  try {
    const d = new Date(isoStr)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (_) {
    return isoStr
  }
}

export function AdminDashboard({ onBackToApp }) {
  const { user } = useAuth()
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast()

  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'users' | 'runs' | 'health'
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds (0 = off)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Tab Data States
  const [overview, setOverview] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(true)

  const [usersData, setUsersData] = useState({ total: 0, items: [] })
  const [usersSearch, setUsersSearch] = useState('')
  const [usersLoading, setUsersLoading] = useState(false)

  const RUNS_PAGE_SIZE = 10

  const [runsData, setRunsData] = useState({ total: 0, items: [] })
  const [runsSearch, setRunsSearch] = useState('')
  const [runsStatusFilter, setRunsStatusFilter] = useState('all')
  const [runsPage, setRunsPage] = useState(1)
  const [runsLoading, setRunsLoading] = useState(false)

  const [healthData, setHealthData] = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // Inspector Modal State
  const [inspectedRunId, setInspectedRunId] = useState(null)
  const [inspectedRun, setInspectedRun] = useState(null)
  const [inspectLoading, setInspectLoading] = useState(false)

  // ── 1. Fetch Overview ─────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    try {
      const data = await fetchAdminOverview()
      setOverview(data)
    } catch (err) {
      toastError(err.message || 'Failed to load admin overview', { title: 'Overview Error' })
    } finally {
      setOverviewLoading(false)
    }
  }, [toastError])

  // ── 2. Fetch Users ────────────────────────────────────────────
  const loadUsers = useCallback(async (searchQuery = '') => {
    setUsersLoading(true)
    try {
      const data = await fetchAdminUsers({ search: searchQuery, limit: 100 })
      setUsersData(data)
    } catch (err) {
      toastError(err.message || 'Failed to load users', { title: 'Users Error' })
    } finally {
      setUsersLoading(false)
    }
  }, [toastError])

  // ── 3. Fetch Runs with 10-item pagination ─────────────────────
  const loadRuns = useCallback(async (page = 1, searchQuery = '', statusFilter = 'all') => {
    setRunsLoading(true)
    try {
      const data = await fetchAdminRuns({
        search: searchQuery,
        status: statusFilter,
        limit: RUNS_PAGE_SIZE,
        offset: (page - 1) * RUNS_PAGE_SIZE,
      })
      setRunsData(data)
      setRunsPage(page)
    } catch (err) {
      toastError(err.message || 'Failed to load research runs', { title: 'Runs Error' })
    } finally {
      setRunsLoading(false)
    }
  }, [toastError])

  // ── 4. Fetch Health Metrics ───────────────────────────────────
  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const data = await fetchAdminServerMetrics()
      setHealthData(data)
    } catch (err) {
      toastError(err.message || 'Failed to load server health', { title: 'Health Error' })
    } finally {
      setHealthLoading(false)
    }
  }, [toastError])

  // ── Master Refresh ────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true)
    try {
      if (activeTab === 'overview') await loadOverview()
      if (activeTab === 'users') await loadUsers(usersSearch)
      if (activeTab === 'runs') await loadRuns(runsPage, runsSearch, runsStatusFilter)
      if (activeTab === 'health') await loadHealth()
    } finally {
      setIsRefreshing(false)
    }
  }, [activeTab, loadOverview, loadUsers, loadRuns, loadHealth, usersSearch, runsPage, runsSearch, runsStatusFilter])

  // Initial tab loading
  useEffect(() => {
    if (activeTab === 'overview') loadOverview()
    if (activeTab === 'users') loadUsers(usersSearch)
    if (activeTab === 'runs') loadRuns(runsPage, runsSearch, runsStatusFilter)
    if (activeTab === 'health') loadHealth()
  }, [activeTab])

  // Auto-refresh timer
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return
    const interval = setInterval(() => {
      refreshAll()
    }, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [refreshInterval, refreshAll])

  // ── Handle Run Inspection ─────────────────────────────────────
  const handleInspectRun = async (runId) => {
    setInspectedRunId(runId)
    setInspectLoading(true)
    try {
      const details = await fetchAdminRunDetail(runId)
      setInspectedRun(details)
    } catch (err) {
      toastError(err.message || 'Could not load run details', { title: 'Inspect Error' })
      setInspectedRunId(null)
    } finally {
      setInspectLoading(false)
    }
  }

  // ── Handle Role Toggle ────────────────────────────────────────
  const handleToggleRole = async (targetUser) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin'
    const confirmMsg = `Are you sure you want to change ${targetUser.email}'s role to ${nextRole.toUpperCase()}?`
    if (!window.confirm(confirmMsg)) return

    try {
      await updateUserRole(targetUser.id, nextRole)
      toastSuccess(`Updated ${targetUser.email} to ${nextRole.toUpperCase()}`, { title: 'Role Updated' })
      loadUsers(usersSearch)
    } catch (err) {
      toastError(err.message || 'Failed to update role', { title: 'Update Error' })
    }
  }

  // ── Handle User Deletion ──────────────────────────────────────
  const handleDeleteUser = async (targetUser) => {
    const confirmMsg = `WARNING: Permanently delete ${targetUser.email} and ALL their research data? This cannot be undone.`
    if (!window.confirm(confirmMsg)) return

    try {
      await adminDeleteUser(targetUser.id)
      toastSuccess(`User ${targetUser.email} deleted.`, { title: 'User Deleted' })
      loadUsers(usersSearch)
      loadOverview()
    } catch (err) {
      toastError(err.message || 'Failed to delete user', { title: 'Delete Error' })
    }
  }

  return (
    <div className="admin-studio-wrapper" style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* ── Topbar ──────────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--panel)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onBackToApp}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            <span>Back to App</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={24} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em' }}>
                Admin Studio
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(124, 106, 240, 0.15)',
                  color: 'var(--violet)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(124, 106, 240, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ShieldCheck size={12} strokeWidth={2.5} /> Superadmin
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Heartbeat pulse & refresh rate */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-dim)' }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: refreshInterval > 0 ? '#10b981' : '#64748b',
                boxShadow: refreshInterval > 0 ? '0 0 8px #10b981' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{
                background: 'var(--panel-alt)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text)',
                fontSize: '12px',
                padding: '3px 8px',
                cursor: 'pointer',
              }}
              title="Auto-refresh interval"
            >
              <option value={10}>Live (10s)</option>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 60s</option>
              <option value={0}>Paused</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={refreshAll}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh current view"
          >
            <RefreshCw
              size={13}
              strokeWidth={2}
              className={isRefreshing ? 'animate-spin' : ''}
              style={{ transition: 'transform 0.5s ease' }}
            />
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* ── Sub Navigation Tabs ─────────────────────────────────── */}
      <div
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--panel)',
          padding: '0 24px',
          display: 'flex',
          gap: 8,
        }}
      >
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'users', label: 'Users', icon: Users, badge: overview?.kpis?.total_users },
          { id: 'runs', label: 'Research Runs', icon: FileText, badge: overview?.kpis?.total_runs },
          { id: 'health', label: 'Server & Health', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--violet)' : 'transparent'}`,
                color: isActive ? 'var(--violet)' : 'var(--text-dim)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={15} strokeWidth={isActive ? 2.2 : 1.75} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: 10,
                    backgroundColor: isActive ? 'rgba(124, 106, 240, 0.18)' : 'var(--panel-alt)',
                    color: isActive ? 'var(--violet)' : 'var(--text-dim)',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content Area ────────────────────────────────────── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px' }}>
        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {overviewLoading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                Loading admin metrics…
              </div>
            ) : (
              <>
                {/* KPI Cards Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 16,
                  }}
                >
                  {/* Users Card */}
                  <div className="admin-kpi-card" style={kpiCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 500 }}>Total Users</span>
                      <div style={iconBadgeStyle('rgba(124, 106, 240, 0.15)', 'var(--violet)')}>
                        <Users size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, margin: '10px 0 4px', color: 'var(--text)' }}>
                      {overview?.kpis?.total_users ?? 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      <strong style={{ color: '#10b981' }}>{overview?.kpis?.verified_users ?? 0}</strong> verified accounts · {overview?.kpis?.total_admins ?? 0} admins
                    </div>
                  </div>

                  {/* Research Runs Card */}
                  <div className="admin-kpi-card" style={kpiCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 500 }}>Research Queries</span>
                      <div style={iconBadgeStyle('rgba(6, 182, 212, 0.15)', '#06b6d4')}>
                        <FileText size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, margin: '10px 0 4px', color: 'var(--text)' }}>
                      {overview?.kpis?.total_runs ?? 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: 8 }}>
                      <span style={{ color: '#10b981' }}>{overview?.kpis?.done_runs ?? 0} completed</span>
                      <span>·</span>
                      <span style={{ color: '#06b6d4' }}>{overview?.kpis?.running_runs ?? 0} active</span>
                    </div>
                  </div>

                  {/* Success Rate Card */}
                  <div className="admin-kpi-card" style={kpiCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 500 }}>Success Rate</span>
                      <div style={iconBadgeStyle('rgba(16, 185, 129, 0.15)', '#10b981')}>
                        <CheckCircle2 size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, margin: '10px 0 4px', color: '#10b981' }}>
                      {overview?.kpis?.success_rate ?? 100}%
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      {overview?.kpis?.total_steps ?? 0} LangGraph reasoning steps processed
                    </div>
                  </div>

                  {/* Public Engagement Card */}
                  <div className="admin-kpi-card" style={kpiCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 500 }}>Public Engagement</span>
                      <div style={iconBadgeStyle('rgba(245, 158, 11, 0.15)', '#f59e0b')}>
                        <Share2 size={16} />
                      </div>
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, margin: '10px 0 4px', color: 'var(--text)' }}>
                      {overview?.kpis?.total_views ?? 0}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      Across {overview?.kpis?.total_shares ?? 0} shared research reports
                    </div>
                  </div>
                </div>

                {/* Recent Platform Activity */}
                <div style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px' }}>Live Platform Activity</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', margin: 0 }}>Latest research queries launched across the platform</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setActiveTab('runs')}
                      style={{ fontSize: '12.5px' }}
                    >
                      View All Runs &rarr;
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)' }}>
                          <th style={{ padding: '10px 12px', fontWeight: 600 }}>Query</th>
                          <th style={{ padding: '10px 12px', fontWeight: 600 }}>Author</th>
                          <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '10px 12px', fontWeight: 600 }}>Loops</th>
                          <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview?.recent_activity?.map((r) => (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                            <td style={{ padding: '12px', fontWeight: 500, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.question}
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-dim)' }}>
                              <div>{r.user_name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{r.user_email}</div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <StatusBadge status={r.status} />
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-dim)' }}>{r.loop_count || 1} loops</td>
                            <td style={{ padding: '12px', color: 'var(--text-dim)', fontSize: '12px' }}>{formatDate(r.created_at)}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleInspectRun(r.id)}
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 2. USERS TAB */}
        {activeTab === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 2px' }}>User Accounts ({usersData.total})</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>Inspect registered accounts, manage administrator roles, and monitor usage.</p>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: 280 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-dim)' }} />
                <input
                  className="form-input"
                  type="search"
                  placeholder="Search name or email…"
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value)
                    loadUsers(e.target.value)
                  }}
                  style={{ paddingLeft: 32, fontSize: '13px', height: 36 }}
                />
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)', backgroundColor: 'var(--panel-alt)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>User</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Role</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Verification</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Queries</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Joined</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                          Loading users…
                        </td>
                      </tr>
                    ) : usersData.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      usersData.items.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  backgroundColor: u.is_admin ? 'rgba(124, 106, 240, 0.2)' : 'var(--panel-alt)',
                                  color: u.is_admin ? 'var(--violet)' : 'var(--text)',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {u.name ? u.name[0].toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{u.name}</div>
                                <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            {u.is_admin ? (
                              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--violet)', backgroundColor: 'rgba(124, 106, 240, 0.12)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(124, 106, 240, 0.3)' }}>
                                Admin
                              </span>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', backgroundColor: 'var(--panel-alt)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                User
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            {u.is_verified ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: '12px' }}>
                                <Check size={13} strokeWidth={2.5} /> Verified
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-faint)', fontSize: '12px' }}>Pending</span>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.runs_count} runs</td>

                          <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-dim)' }}>
                            {formatDate(u.created_at)}
                          </td>

                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleToggleRole(u)}
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                                title={u.is_admin ? 'Demote to regular user' : 'Promote to admin'}
                              >
                                {u.is_admin ? 'Demote' : 'Promote'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleDeleteUser(u)}
                                style={{ fontSize: '12px', padding: '4px 8px', color: '#ef4444' }}
                                title="Cascade delete user"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. RESEARCH RUNS TAB */}
        {activeTab === 'runs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 2px' }}>Research Runs ({runsData.total})</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>All queries executed on the platform. Click any run to inspect the full report.</p>
              </div>

              {/* Status Filter + Search */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 2 }}>
                  {['all', 'done', 'running', 'failed'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setRunsStatusFilter(st)
                        loadRuns(1, runsSearch, st)
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        backgroundColor: runsStatusFilter === st ? 'var(--violet)' : 'transparent',
                        color: runsStatusFilter === st ? '#ffffff' : 'var(--text-dim)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative', width: 240 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-dim)' }} />
                  <input
                    className="form-input"
                    type="search"
                    placeholder="Search queries…"
                    value={runsSearch}
                    onChange={(e) => {
                      setRunsSearch(e.target.value)
                      loadRuns(1, e.target.value, runsStatusFilter)
                    }}
                    style={{ paddingLeft: 32, fontSize: '13px', height: 36 }}
                  />
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-dim)', backgroundColor: 'var(--panel-alt)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Research Question</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>User</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Loops</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Public?</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Created</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runsLoading ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                          Loading runs…
                        </td>
                      </tr>
                    ) : runsData.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                          No research runs found.
                        </td>
                      </tr>
                    ) : (
                      runsData.items.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => handleInspectRun(r.id)}
                          style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                          className="table-row-hover"
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 600, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.question}
                          </td>

                          <td style={{ padding: '12px 16px', color: 'var(--text-dim)' }}>
                            <div>{r.user_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{r.user_email}</div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <StatusBadge status={r.status} />
                          </td>

                          <td style={{ padding: '12px 16px', color: 'var(--text-dim)' }}>
                            {r.loop_count || 1} loops · {r.sources_count} sources
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            {r.is_public ? (
                              <span style={{ fontSize: '11.5px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Share2 size={11} /> {r.views_count} views
                              </span>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: 'var(--text-faint)' }}>Private</span>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-dim)' }}>
                            {formatDate(r.created_at)}
                          </td>

                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleInspectRun(r.id)
                              }}
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                            >
                              Inspect Report &rarr;
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 10-Item Pagination Bar */}
              {runsData.total > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 18px',
                    backgroundColor: 'var(--panel-alt)',
                    borderTop: '1px solid var(--border)',
                    fontSize: '12.5px',
                    color: 'var(--text-dim)',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    Showing{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      {(runsPage - 1) * RUNS_PAGE_SIZE + 1}
                    </strong>{' '}
                    to{' '}
                    <strong style={{ color: 'var(--text)' }}>
                      {Math.min(runsPage * RUNS_PAGE_SIZE, runsData.total)}
                    </strong>{' '}
                    of <strong style={{ color: 'var(--text)' }}>{runsData.total}</strong> runs
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => loadRuns(runsPage - 1, runsSearch, runsStatusFilter)}
                      disabled={runsPage <= 1 || runsLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        fontSize: '12px',
                        height: 28,
                      }}
                    >
                      <ChevronLeft size={13} strokeWidth={2} />
                      <span>Previous</span>
                    </button>

                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', padding: '0 4px' }}>
                      Page {runsPage} of {Math.max(1, Math.ceil(runsData.total / RUNS_PAGE_SIZE))}
                    </span>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => loadRuns(runsPage + 1, runsSearch, runsStatusFilter)}
                      disabled={
                        runsPage >= Math.ceil(runsData.total / RUNS_PAGE_SIZE) || runsLoading
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        fontSize: '12px',
                        height: 28,
                      }}
                    >
                      <span>Next</span>
                      <ChevronRight size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. SERVER HEALTH TAB */}
        {activeTab === 'health' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 2px' }}>Server & System Telemetry</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>Real-time hardware resource consumption and service connectivity status.</p>
            </div>

            {healthLoading && !healthData ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                Polling server telemetry…
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {/* CPU & Memory Card */}
                <div style={telemetryCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={iconBadgeStyle('rgba(124, 106, 240, 0.15)', 'var(--violet)')}>
                      <Cpu size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Compute & Memory</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Host System Resources</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: 5 }}>
                        <span style={{ color: 'var(--text-dim)' }}>CPU Utilization</span>
                        <strong style={{ color: 'var(--text)' }}>{healthData?.cpu?.percent ?? 0}%</strong>
                      </div>
                      <ProgressBar percent={healthData?.cpu?.percent ?? 0} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: 5 }}>
                        <span style={{ color: 'var(--text-dim)' }}>Memory (RAM)</span>
                        <strong style={{ color: 'var(--text)' }}>
                          {healthData?.memory?.used_mb ?? 0} MB / {healthData?.memory?.total_mb ?? 0} MB ({healthData?.memory?.percent ?? 0}%)
                        </strong>
                      </div>
                      <ProgressBar percent={healthData?.memory?.percent ?? 0} />
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                      <strong>Process Uptime:</strong> {formatUptime(healthData?.uptime_seconds)}
                    </div>
                  </div>
                </div>

                {/* Disk Storage Card */}
                <div style={telemetryCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={iconBadgeStyle('rgba(6, 182, 212, 0.15)', '#06b6d4')}>
                      <HardDrive size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Storage Volume</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>SSD Disk Allocation</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: 5 }}>
                        <span style={{ color: 'var(--text-dim)' }}>Used Storage</span>
                        <strong style={{ color: 'var(--text)' }}>
                          {healthData?.disk?.used_gb ?? 0} GB / {healthData?.disk?.total_gb ?? 0} GB ({healthData?.disk?.percent ?? 0}%)
                        </strong>
                      </div>
                      <ProgressBar percent={healthData?.disk?.percent ?? 0} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <span>Free Disk Space:</span>
                      <strong style={{ color: '#10b981' }}>{healthData?.disk?.free_gb ?? 0} GB available</strong>
                    </div>
                  </div>
                </div>

                {/* Database Connectivity Card */}
                <div style={telemetryCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={iconBadgeStyle('rgba(16, 185, 129, 0.15)', '#10b981')}>
                      <Database size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>PostgreSQL Database</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Async Connection Pool</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Connection Status:</span>
                      <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} /> Connected
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Query Round-Trip Latency:</span>
                      <strong style={{ color: 'var(--text)' }}>{healthData?.database?.latency_ms ?? 0} ms</strong>
                    </div>
                  </div>
                </div>

                {/* AI Model & SMTP Relay Card */}
                <div style={telemetryCardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={iconBadgeStyle('rgba(245, 158, 11, 0.15)', '#f59e0b')}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>AI Engine & Services</h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>LLM & Email Dispatch</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Groq LLM Engine:</span>
                      <span style={{ color: 'var(--violet)', fontWeight: 600 }}>{healthData?.llm_engine?.model ?? 'openai/gpt-oss-120b'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Brevo SMTP Relay:</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>{healthData?.smtp_relay?.host}:{healthData?.smtp_relay?.port}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Environment:</span>
                      <strong style={{ color: 'var(--text)' }}>{healthData?.environment?.app_env} · Python {healthData?.environment?.python_version}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── 5. Run Inspector Modal ───────────────────────────────── */}
      {inspectedRunId && (
        <div className="modal-overlay" onClick={() => setInspectedRunId(null)}>
          <div
            className="modal-box animate-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 840, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={inspectedRun?.status || 'running'} />
                <h2 className="modal-title" style={{ fontSize: '16px', maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inspectedRun?.question || 'Research Inspector'}
                </h2>
              </div>
              <button className="modal-close" onClick={() => setInspectedRunId(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {inspectLoading ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                  Loading research payload…
                </div>
              ) : inspectedRun ? (
                <>
                  {/* Meta Bar */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 12,
                      padding: '12px 16px',
                      backgroundColor: 'var(--panel-alt)',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      fontSize: '12.5px',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Author:</span>{' '}
                      <strong>{inspectedRun.user_name}</strong> ({inspectedRun.user_email})
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Loops:</span>{' '}
                      <strong>{inspectedRun.loop_count || 1}</strong> · <strong>{inspectedRun.sources?.length || 0} sources</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Created:</span>{' '}
                      <strong>{formatDate(inspectedRun.created_at)}</strong>
                    </div>
                    {inspectedRun.is_public && inspectedRun.share_token && (
                      <div>
                        <a
                          href={`https://research.mychatbot.codes/share/${inspectedRun.share_token}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--violet)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}
                        >
                          <ExternalLink size={12} /> Open Public Link
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Markdown Report Render */}
                  {inspectedRun.final_report ? (
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px', color: 'var(--text)' }}>
                        Synthesized Executive Report
                      </h4>
                      <div
                        className="report-markdown-content"
                        style={{
                          padding: '16px 20px',
                          backgroundColor: 'var(--panel)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          fontSize: '13.5px',
                          lineHeight: 1.6,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(inspectedRun.final_report),
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: '24px', backgroundColor: 'var(--panel-alt)', borderRadius: 8, color: 'var(--text-dim)', textAlign: 'center' }}>
                      No final report generated for this run yet.
                    </div>
                  )}

                  {/* Sources List */}
                  {inspectedRun.sources && inspectedRun.sources.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px', color: 'var(--text)' }}>
                        Ranked Sources & Evidence ({inspectedRun.sources.length})
                      </h4>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {inspectedRun.sources.map((item, idx) => {
                          const url = typeof item === 'string' ? item : item?.url || ''
                          const score = typeof item === 'object' && item?.score ? item.score : null
                          const domain = typeof item === 'object' && item?.domain ? item.domain : (url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || url)
                          const auth = typeof item === 'object' ? item?.authority_label : null
                          return (
                            <li
                              key={idx}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--panel)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                fontSize: '12.5px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                <span style={{ color: 'var(--text-dim)', fontWeight: 700 }}>[{idx + 1}]</span>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: 'var(--text)',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={url}
                                >
                                  {domain}
                                </a>
                                {auth && (
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', backgroundColor: 'var(--panel-alt)', padding: '1px 6px', borderRadius: 4 }}>
                                    {auth}
                                  </span>
                                )}
                              </div>
                              {score !== null && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: 6,
                                    backgroundColor: score >= 80 ? 'rgba(16, 185, 129, 0.14)' : score >= 60 ? 'rgba(6, 182, 212, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                                    color: score >= 80 ? '#10b981' : score >= 60 ? '#06b6d4' : '#f59e0b',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {score}% Relevance
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── UI Helper Components ──────────────────────────────────────────

function StatusBadge({ status }) {
  const isDone = status === 'done'
  const isRunning = status === 'running'
  const isFailed = status === 'failed'

  let bg = 'rgba(100, 116, 139, 0.15)'
  let color = '#94a3b8'
  let label = status

  if (isDone) {
    bg = 'rgba(16, 185, 129, 0.12)'
    color = '#10b981'
    label = 'Completed'
  } else if (isRunning) {
    bg = 'rgba(6, 182, 212, 0.12)'
    color = '#06b6d4'
    label = 'Running…'
  } else if (isFailed) {
    bg = 'rgba(239, 68, 68, 0.12)'
    color = '#ef4444'
    label = 'Failed'
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: '11.5px',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${color}33`,
      }}
    >
      {isRunning && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#06b6d4',
            display: 'inline-block',
          }}
          className="animate-pulse"
        />
      )}
      {label}
    </span>
  )
}

function ProgressBar({ percent }) {
  const p = Math.min(100, Math.max(0, percent || 0))
  let barColor = '#10b981' // Green < 60%
  if (p >= 85) barColor = '#ef4444' // Red >= 85%
  else if (p >= 60) barColor = '#f59e0b' // Yellow 60-85%

  return (
    <div style={{ height: 6, width: '100%', backgroundColor: 'var(--panel-alt)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div
        style={{
          width: `${p}%`,
          height: '100%',
          backgroundColor: barColor,
          transition: 'width 0.4s ease, background-color 0.3s ease',
        }}
      />
    </div>
  )
}

const kpiCardStyle = {
  backgroundColor: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '18px 20px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
}

const telemetryCardStyle = {
  backgroundColor: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '20px',
}

function iconBadgeStyle(bg, color) {
  return {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: bg,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }
}

export default AdminDashboard
