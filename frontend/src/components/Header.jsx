import { useState, useRef, useEffect } from 'react'
import { Plus, LogOut, PanelLeft, Trash2, ChevronDown, KeyRound, ShieldCheck, Users, Zap, Sparkles, BarChart2, Folder, BookOpen, Compass, Settings, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AuthModal } from './AuthModal'
import { DeleteAccountModal } from './DeleteAccountModal'
import { ChangePasswordModal } from './ChangePasswordModal'
import { ThemeToggle } from './ThemeToggle'
import { useToast } from '../context/ToastContext'
import { Logo } from './brand/Logo'

export default function Header({
  isSidebarCollapsed,
  onToggleSidebar,
  onNewResearch,
  onOpenAdmin,
  onOpenAnalytics,
  onOpenLibrary,
  onOpenDiscover,
  onOpenSettings,
  onOpenLanding,
  isDiscoverView,
  engine,
}) {
  const { user, logout } = useAuth()
  const { info: toastInfo } = useToast()
  const [showAuth, setShowAuth] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showChangePwModal, setShowChangePwModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  const isAdmin =
    user &&
    (user.is_admin ||
      user.role === 'admin' ||
      ['samjanjua6@gmail.com', 'aliexports63@gmail.com'].includes(user.email?.toLowerCase()))

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const handleLogout = () => {
    setShowUserMenu(false)
    logout()
    toastInfo('You have been signed out.', { title: 'Signed Out' })
  }

  // User initials badge from first + last name
  const initials = user
    ? user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : ''

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          {onToggleSidebar && (
            <button
              type="button"
              className={`sidebar-toggle-btn ${isSidebarCollapsed ? 'active' : ''}`}
              onClick={onToggleSidebar}
              title={isSidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              aria-label="Toggle sidebar"
            >
              <PanelLeft size={16} strokeWidth={1.75} />
            </button>
          )}

          <div className="topbar-brand" onClick={onNewResearch} style={{ cursor: 'pointer' }}>
            <Logo size={24} />
          </div>

          {isSidebarCollapsed && onNewResearch && (
            <button
              type="button"
              className="topbar-new-research-btn animate-in"
              onClick={onNewResearch}
              title="Start a new research query"
            >
              <Plus size={13} strokeWidth={2} /> New Research
            </button>
          )}
        </div>

        <div className="topbar-right">
          {engine === 'crewai' ? (
            <span
              className="topbar-badge"
              style={{
                borderColor: 'rgba(124, 106, 240, 0.4)',
                backgroundColor: 'rgba(124, 106, 240, 0.1)',
                color: 'var(--violet)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="Current run powered by CrewAI 4-Agent Team"
            >
              <Users size={11} strokeWidth={2.2} /> Powered by CrewAI
            </span>
          ) : engine === 'langgraph' ? (
            <span
              className="topbar-badge"
              style={{
                borderColor: 'rgba(6, 182, 212, 0.4)',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                color: '#06b6d4',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="Current run powered by LangGraph StateGraph Engine"
            >
              <Zap size={11} strokeWidth={2.2} /> Powered by LangGraph
            </span>
          ) : (
            <span className="topbar-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={11} strokeWidth={2.2} /> Dual-Engine Multi-Agent
            </span>
          )}

          <ThemeToggle />

          {onOpenLanding && (
            <button
              type="button"
              className="topbar-btn"
              onClick={onOpenLanding}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-dim)',
                padding: '5px 11px',
                borderRadius: '7px',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
              title="Product Tour & Features (/landing)"
            >
              <Sparkles size={13} strokeWidth={2} style={{ color: 'var(--violet)' }} />
              <span>Tour</span>
            </button>
          )}

          {onOpenDiscover && (
            <button
              type="button"
              className="topbar-btn"
              onClick={onOpenDiscover}
              style={{
                background: isDiscoverView ? 'rgba(124, 106, 240, 0.15)' : 'transparent',
                border: isDiscoverView ? '1px solid var(--violet)' : '1px solid var(--border)',
                color: isDiscoverView ? 'var(--violet)' : 'var(--text-dim)',
                padding: '5px 11px',
                borderRadius: '7px',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
              title="Explore public community research showcase (/discover)"
            >
              <Compass size={13} strokeWidth={2} />
              <span>Discover</span>
            </button>
          )}

          {user ? (
            <div className="user-menu-wrapper" ref={menuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="user-avatar-btn"
                onClick={() => setShowUserMenu((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
                aria-haspopup="true"
                aria-expanded={showUserMenu}
              >
                <div className="user-avatar" title={user.name}>
                  {initials}
                </div>
                <span className="user-name" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  {user.name}
                </span>
                <ChevronDown size={13} strokeWidth={2} style={{ color: 'var(--text-dim)' }} />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div
                  className="user-dropdown-menu animate-in"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 220,
                    backgroundColor: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '6px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
                    zIndex: 350,
                  }}
                >
                  <div
                    style={{
                      padding: '8px 10px 10px',
                      borderBottom: '1px solid var(--border)',
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                      {user.email}
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false)
                        onOpenAdmin?.()
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '7px 10px',
                        borderRadius: 6,
                        fontSize: '12.5px',
                        color: 'var(--violet)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        marginBottom: 2,
                      }}
                    >
                      <ShieldCheck size={13} strokeWidth={2.2} />
                      <span>Admin Studio</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false)
                      onOpenDiscover?.()
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: '12.5px',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      marginBottom: 2,
                    }}
                  >
                    <Compass size={13} strokeWidth={2} style={{ color: 'var(--cyan)' }} />
                    <span>Discover Showcase</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false)
                      onOpenLibrary?.()
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: '12.5px',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      marginBottom: 2,
                    }}
                  >
                    <Folder size={13} strokeWidth={2} style={{ color: '#10b981' }} />
                    <span>Research Library</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false)
                      onOpenAnalytics?.()
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: '12.5px',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      marginBottom: 2,
                    }}
                  >
                    <BarChart2 size={13} strokeWidth={2} style={{ color: 'var(--violet)' }} />
                    <span>Usage & Analytics</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false)
                      onOpenSettings?.()
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: '12.5px',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      marginBottom: 2,
                    }}
                  >
                    <Settings size={13} strokeWidth={2} style={{ color: 'var(--amber)' }} />
                    <span>Settings & BYOK</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false)
                      setShowChangePwModal(true)
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: '12.5px',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <KeyRound size={13} strokeWidth={1.75} />
                    <span>Change Password</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: '12.5px',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <LogOut size={13} strokeWidth={1.75} />
                    <span>Sign Out</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-item dropdown-danger"
                    onClick={() => {
                      setShowUserMenu(false)
                      setShowDeleteModal(true)
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: '12.5px',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      marginTop: 2,
                    }}
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                    <span>Delete Account</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAuth(true)}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      )}

      {showChangePwModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePwModal(false)}
          onForgotPassword={() => {
            setShowAuth(true)
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => {
            if (onNewResearch) onNewResearch()
          }}
        />
      )}
    </>
  )
}
