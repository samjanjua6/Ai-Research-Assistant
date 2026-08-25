import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const THEME_KEY = 'theme_preference'

const ThemeContext = createContext({
  theme: 'system',
  effectiveTheme: 'dark',
  setTheme: () => {},
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

  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  // Compute the current active theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme

  // Apply data-theme to document element whenever effectiveTheme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }, [effectiveTheme])

  // Listen for OS system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    // Modern API with fallback
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
    } catch {
      // Storage unavailable / quota exceeded
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
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
