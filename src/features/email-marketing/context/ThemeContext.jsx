import { createContext, useEffect, useMemo, useState } from 'react'

export const ThemeContext = createContext(null)

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('theme_mode') || 'light')

  useEffect(() => {
    const root = document.documentElement
    const resolvedTheme = themeMode === 'system' ? getSystemTheme() : themeMode
    root.dataset.theme = resolvedTheme
    localStorage.setItem('theme_mode', themeMode)

    if (themeMode !== 'system') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      root.dataset.theme = getSystemTheme()
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themeMode])

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
    }),
    [themeMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
