import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AuthModal } from './AuthModal'
import { ThemeToggle } from './ThemeToggle'

export default function Header() {
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
        <div className="topbar-brand">
          <span className="topbar-mark">🔬</span>
          Research Assistant
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
