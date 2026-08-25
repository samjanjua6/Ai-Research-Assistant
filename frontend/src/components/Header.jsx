import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AuthModal } from './AuthModal'
import { ThemeToggle } from './ThemeToggle'

export default function Header({ isSidebarCollapsed, onToggleSidebar, onNewResearch }) {
  const { user, logout } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <line x1="9" x2="9" y1="3" y2="21"/>
              </svg>
            </button>
          )}

          <div className="topbar-brand">
            <span className="topbar-mark">🔬</span>
            Research Assistant
          </div>

          {isSidebarCollapsed && onNewResearch && (
            <button
              type="button"
              className="topbar-new-research-btn animate-in"
              onClick={onNewResearch}
              title="Start a new research query"
            >
              <span>✨</span> New Research
            </button>
          )}
        </div>

        <div className="topbar-right">
          <span className="topbar-badge">Powered by LangGraph</span>

          <ThemeToggle />

          {user ? (
            <div className="user-menu">
              <div className="user-avatar" title={user.name} aria-label={`Signed in as ${user.name}`}>
                {initials}
              </div>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={logout}
                title="Sign out"
              >
                Sign Out
              </button>
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
    </>
  )
}
