'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  BASE_THEME_NAME,
  VisualThemeName,
  VISUAL_THEMES,
  SWITCHABLE_VISUAL_THEMES,
  THEME_STORAGE_KEY,
  getVisualThemeCSSVariables,
} from './themes'

/**
 * 主题类型（兼容性）
 */
export type ThemeName = VisualThemeName | typeof BASE_THEME_NAME

interface ThemeContextType {
  theme: ThemeName
  themeConfig: typeof VISUAL_THEMES[VisualThemeName] | null
  setTheme: (theme: ThemeName) => void
  availableThemes: VisualThemeName[]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * ThemeProvider
 * 
 * 职责边界（严格限制）：
 * ✅ 允许：
 *   - 注入 CSS variables（通过内联 style 属性）
 *   - 管理当前 visual theme key（通过 data-theme 属性）
 *   - 读取/写入 localStorage（仅用于 visual theme 持久化）
 * 
 * ⛔ 禁止：
 *   - 控制组件显示/隐藏（不包含任何条件渲染逻辑）
 *   - 控制布局或业务逻辑（不包含任何布局相关的 CSS）
 *   - 控制组件状态（不包含任何业务状态管理）
 * 
 * 核心原则：
 * 1. Base Theme 永远先加载（通过 globals.css 的 :root，不受 ThemeProvider 控制）
 * 2. Visual Theme 以覆盖层形式叠加（通过 data-theme 和 CSS 变量覆盖）
 * 3. Base Theme 不允许被切换、不参与主题选择、不保存到 localStorage
 * 4. 仅 Visual Themes 才能被动态切换和保存到 localStorage
 * 
 * ⛔ 严格禁止：
 * - Visual Themes 严禁修改 spacing、layout、组件结构
 * - Visual Themes 只能覆盖颜色、圆角、阴影、字体
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 初始状态：Base Theme 作为默认值（Base Theme 通过 globals.css 的 :root 自动加载）
  const [theme, setThemeState] = useState<ThemeName>(BASE_THEME_NAME)

  // 初始化：Base Theme 永远先加载，然后检查是否有 Visual Theme 需要叠加
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement

    // 步骤 1：确保 Base Theme 先加载（通过 globals.css 的 :root）
    // ⚠️ 重要：Base Theme 只在 CSS 中定义（@layer base-theme），不被 JavaScript 动态注入
    // ⚠️ 重要：Base Theme 通过 globals.css 的 :root 自动应用，不需要任何 JavaScript 操作
    // 我们只需要确保没有残留的 data-theme 或内联样式干扰 Base Theme
    root.removeAttribute('data-theme')
    root.removeAttribute('style')

    // 步骤 2：检查是否有可切换的 Visual Theme 需要叠加
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as VisualThemeName | null

    if (savedTheme && SWITCHABLE_VISUAL_THEMES.includes(savedTheme) && VISUAL_THEMES[savedTheme]) {
      // Visual Theme 作为覆盖层叠加在 Base Theme 之上
      const visualThemeConfig = VISUAL_THEMES[savedTheme]
      const visualCssVars = getVisualThemeCSSVariables(visualThemeConfig)
      
      // 设置 data-theme 属性（用于 CSS 选择器）
      root.setAttribute('data-theme', savedTheme)
      
      // 注入 Visual Theme 的 CSS 变量（覆盖 Base Theme 的对应变量）
      // ⚠️ 重要：只注入视觉相关的 CSS 变量，不包含结构变量（--spacing-*, --layout-*, --font-size-*, --line-height-*, --z-index-*）
      // ⚠️ 重要：Visual Theme 作为覆盖层叠加在 Base Theme 之上（CSS @layer visual-theme）
      root.setAttribute('style', visualCssVars)
      
      setThemeState(savedTheme)
    } else {
      // 没有 Visual Theme，使用 Base Theme（已经通过 globals.css 的 :root 加载）
      setThemeState(BASE_THEME_NAME)
    }
  }, [])

  // 应用 Visual Theme（作为覆盖层叠加在 Base Theme 之上）
  const applyVisualTheme = useCallback((themeName: VisualThemeName) => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    const visualThemeConfig = VISUAL_THEMES[themeName]

    if (!visualThemeConfig) {
      console.warn('[ThemeProvider] 无效的 Visual Theme:', themeName)
      return
    }

    // Visual Theme 作为覆盖层叠加：
    // 1. Base Theme 的 CSS 变量（来自 globals.css 的 @layer base-theme）仍然存在
    // 2. Visual Theme 的 CSS 变量（通过内联 style，对应 @layer visual-theme）覆盖对应的变量
    // ⚠️ 重要：只注入视觉相关的 CSS 变量，不包含结构变量（--spacing-*, --layout-*, --font-size-*, --line-height-*, --z-index-*）
    const visualCssVars = getVisualThemeCSSVariables(visualThemeConfig)
    root.setAttribute('data-theme', themeName)
    root.setAttribute('style', visualCssVars)
    
    // 保存到 localStorage（仅用于 Visual Theme）
    localStorage.setItem(THEME_STORAGE_KEY, themeName)
  }, [])

  // 移除 Visual Theme，回到 Base Theme
  const removeVisualTheme = useCallback(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    
    // 移除 data-theme 和内联样式，回到 Base Theme（通过 globals.css 的 :root）
    root.removeAttribute('data-theme')
    root.removeAttribute('style')
    
    // 删除 localStorage 中的 Visual Theme
    localStorage.removeItem(THEME_STORAGE_KEY)
  }, [])

  // 主题变化时应用
  useEffect(() => {
    if (theme === BASE_THEME_NAME) {
      // Base Theme：移除 Visual Theme 覆盖层
      removeVisualTheme()
    } else {
      // Visual Theme：作为覆盖层叠加
      applyVisualTheme(theme as VisualThemeName)
    }
  }, [theme, applyVisualTheme, removeVisualTheme])

  const setTheme = useCallback((themeName: ThemeName) => {
    // ⛔ 禁止切换 Base Theme
    if (themeName === BASE_THEME_NAME) {
      console.warn('[ThemeProvider] Base Theme 不允许被切换，已忽略')
      return
    }
    
    // 只允许切换 Visual Themes
    if (SWITCHABLE_VISUAL_THEMES.includes(themeName as VisualThemeName)) {
      setThemeState(themeName)
    } else {
      console.warn('[ThemeProvider] 无效的主题名称:', themeName)
    }
  }, [])

  const value: ThemeContextType = {
    theme,
    themeConfig: theme !== BASE_THEME_NAME ? VISUAL_THEMES[theme as VisualThemeName] : null,
    setTheme,
    availableThemes: SWITCHABLE_VISUAL_THEMES,
  }

  // 始终提供 context，不控制组件显示/隐藏
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
