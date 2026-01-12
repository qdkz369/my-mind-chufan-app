'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { ThemeName, themes, defaultTheme, THEME_STORAGE_KEY, getThemeCSSVariables } from './themes'

interface ThemeContextType {
  theme: ThemeName
  themeConfig: typeof themes[ThemeName]
  setTheme: (theme: ThemeName) => void
  applyTheme: (theme: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  // 从localStorage加载主题
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName
      if (savedTheme && themes[savedTheme]) {
        setThemeState(savedTheme)
      }
      setMounted(true)
    }
  }, [])

  // 应用主题到DOM
  const applyTheme = useCallback((themeName: ThemeName) => {
    if (typeof window === 'undefined') return

    const themeConfig = themes[themeName]
    const root = document.documentElement

    // 应用CSS变量
    const cssVars = getThemeCSSVariables(themeConfig)
    root.setAttribute('style', cssVars)
    root.setAttribute('data-theme', themeName)

    // 保存到localStorage
    localStorage.setItem(THEME_STORAGE_KEY, themeName)
  }, [])

  // 主题变化时应用
  useEffect(() => {
    if (mounted) {
      applyTheme(theme)
    }
  }, [theme, mounted, applyTheme])

  const setTheme = useCallback((themeName: ThemeName) => {
    setThemeState(themeName)
  }, [])

  const value: ThemeContextType = {
    theme,
    themeConfig: themes[theme],
    setTheme,
    applyTheme,
  }

  // 始终提供 context，即使在没有 mounted 的情况下（避免 useTheme 错误）
  // 在 mounted 之前使用默认值
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
