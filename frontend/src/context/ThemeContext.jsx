import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const THEME_KEY = 'theme_preference'
const ACCENT_KEY = 'accent_preference'

const ThemeContext = createContext({
  theme: 'system',
  effectiveTheme: 'dark',
  setTheme: () => {},
  accent: 'violet',
  setAccent: () => {},
})

function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'system'
    } catch {
      return 'system'
    }
  })

  const [accent, setAccentState] = useState(() => {
    try {
      return localStorage.getItem(ACCENT_KEY) || 'violet'
    } catch {
      return 'violet'
    }
  })

  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  // Compute the current active theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme

  // Apply data-theme to document element whenever effectiveTheme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }, [effectiveTheme])

  // Apply data-accent to document element whenever accent changes
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
  }, [accent])

  // Listen for OS system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(THEME_KEY, newTheme)
    } catch {}
  }, [])

  const setAccent = useCallback((newAccent) => {
    setAccentState(newAccent)
    try {
      localStorage.setItem(ACCENT_KEY, newAccent)
    } catch {}
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
