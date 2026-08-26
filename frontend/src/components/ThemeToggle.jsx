import { Monitor, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="theme-toggle-group" role="radiogroup" aria-label="Theme selection">
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'system'}
        className={`theme-toggle-btn ${theme === 'system' ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        title="System theme"
        aria-label="System theme"
      >
        <Monitor size={14} strokeWidth={1.75} className="theme-icon" />
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title="Light theme"
        aria-label="Light theme"
      >
        <Sun size={14} strokeWidth={1.75} className="theme-icon" />
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title="Dark theme"
        aria-label="Dark theme"
      >
        <Moon size={14} strokeWidth={1.75} className="theme-icon" />
      </button>
    </div>
  )
}

export default ThemeToggle
