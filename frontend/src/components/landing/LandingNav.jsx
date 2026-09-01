import { Sparkles, ArrowRight, Sun, Moon, LogIn, ExternalLink } from 'lucide-react'
import { LogoMark } from '../brand/Logo'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'

export function LandingNav({ onOpenWorkspace, onOpenAuth }) {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="landing-nav">
      <div className="landing-container">
        <div className="landing-nav-inner">
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onOpenWorkspace}>
            <LogoMark size={28} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>
                Research <span style={{ color: 'var(--violet)' }}>Assistant</span>
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.04em', fontWeight: 600 }}>
                AUTONOMOUS PEER-REVIEWED AI
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="landing-nav-links">
            <a className="landing-nav-link" onClick={() => scrollTo('capabilities')}>Capabilities</a>
            <a className="landing-nav-link" onClick={() => scrollTo('comparison')}>Comparison</a>
            <a className="landing-nav-link" onClick={() => scrollTo('academic-engine')}>Academic Engine</a>
            <a className="landing-nav-link" onClick={() => scrollTo('use-cases')}>Use Cases</a>
            <a className="landing-nav-link" onClick={() => scrollTo('faq')}>FAQ</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="landing-nav-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              style={{ padding: '7px 10px', borderRadius: 8 }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {!user ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onOpenAuth}
                style={{ fontSize: '13px', padding: '7px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
            ) : null}

            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenWorkspace}
              style={{
                fontSize: '13px',
                padding: '8px 18px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(124, 106, 240, 0.4)',
              }}
            >
              <span>{user ? 'Open Workspace' : 'Launch Free Demo'}</span>
              <ArrowRight size={14} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
