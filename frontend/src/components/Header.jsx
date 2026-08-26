import { useState } from 'react'
import { Plus, LogOut, PanelLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AuthModal } from './AuthModal'
import { ThemeToggle } from './ThemeToggle'
import { useToast } from '../context/ToastContext'
import { Logo } from './brand/Logo'

export default function Header({ isSidebarCollapsed, onToggleSidebar, onNewResearch }) {
  const { user, logout } = useAuth()
  const { info: toastInfo } = useToast()
  const [showAuth, setShowAuth] = useState(false)

  const handleLogout = () => {
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
                onClick={handleLogout}
                title="Sign out"
              >
                <LogOut size={13} strokeWidth={1.75} />
                <span>Sign Out</span>
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
