'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  BASE_THEME_NAME,
  DEFAULT_THEME_NAME,
  DEFAULT_THEME_CONFIG,
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
 * ✅ Theme 系统只控制：
 * - 颜色（colors）
 * - 字体（font-family，不是 font-size）
 * - 阴影（shadows）
 * - 圆角（border-radius）
 * 
 * ⛔ Theme 系统严禁控制：
 * - 布局结构（Grid / Flex 方向）→ 已迁移到 BaseLayout / DashboardLayout 组件
 * - 卡片信息层级（标题 / 主数值 / 辅助说明）→ 已迁移到 CardSkeleton 组件
 * - 组件密度（padding / gap）→ 已迁移到 density.css（data-density 属性）
 * - 信息显示顺序 → 已迁移到 CardSkeleton 组件
 * - 字体大小（font-size）→ 设计系统基础变量（不属于 Theme）
 * - 行高（line-height）→ 设计系统基础变量（不属于 Theme）
 * - 间距（spacing）→ 设计系统基础变量（不属于 Theme）
 * - 层级（z-index）→ 设计系统基础变量（不属于 Theme）
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 初始状态：Base Theme 作为默认值（Base Theme 通过 globals.css 的 :root 自动加载）
  const [theme, setThemeState] = useState<ThemeName>(BASE_THEME_NAME)

  // 初始化：仅在"无本地缓存主题"时才设置 default，否则应用保存的主题
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement

    // 检查是否有保存的主题
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as VisualThemeName | null
    const isFirstVisit = savedTheme === null

    if (isFirstVisit) {
      // 仅在"无本地缓存主题"时才设置 default
      // DefaultTheme 已经通过 globals.css 的 :root 加载
      // 必须清除 data-theme 和 style，确保完全使用 DefaultTheme（避免内联脚本设置的不完整变量残留）
      console.log('[ThemeProvider] 无本地缓存主题，使用 DefaultTheme')
      root.removeAttribute('data-theme')
      root.removeAttribute('style')
      setThemeState(BASE_THEME_NAME)
      // 不保存到 localStorage，确保 DefaultTheme 始终作为默认值
    } else if (savedTheme && SWITCHABLE_VISUAL_THEMES.includes(savedTheme) && VISUAL_THEMES[savedTheme]) {
      // 有保存的主题：应用保存的 Visual Theme（作为覆盖层叠加在 DefaultTheme 之上）
      const visualThemeConfig = VISUAL_THEMES[savedTheme]
      const visualCssVars = getVisualThemeCSSVariables(visualThemeConfig)
      
      // 设置 data-theme 属性（用于 CSS 选择器）
      root.setAttribute('data-theme', savedTheme)
      
      // 注入 Visual Theme 的 CSS 变量（覆盖 DefaultTheme 的对应变量）
      // ⚠️ 重要：只注入视觉相关的 CSS 变量，不包含结构变量（--spacing-*, --layout-*, --font-size-*, --line-height-*, --z-index-*）
      // ⚠️ 重要：Visual Theme 作为覆盖层叠加在 DefaultTheme 之上（CSS @layer visual-theme）
      // ⚠️ 重要：使用完整的 CSS 变量覆盖内联脚本可能设置的不完整变量
      root.setAttribute('style', visualCssVars)
      
      setThemeState(savedTheme)
    } else {
      // 保存的主题无效：清除无效主题，使用 DefaultTheme
      console.log('[ThemeProvider] 保存的主题无效，清除并使用 DefaultTheme')
      localStorage.removeItem(THEME_STORAGE_KEY)
      root.removeAttribute('data-theme')
      root.removeAttribute('style')
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
    if (theme === BASE_THEME_NAME || theme === DEFAULT_THEME_NAME) {
      // DefaultTheme（Base Theme）：移除 Visual Theme 覆盖层，回到 DefaultTheme
      // DefaultTheme 已经通过 globals.css 的 :root 加载，只需要移除覆盖层
      removeVisualTheme()
    } else {
      // Visual Theme：作为覆盖层叠加在 DefaultTheme 之上
      applyVisualTheme(theme as VisualThemeName)
    }
  }, [theme, applyVisualTheme, removeVisualTheme])

  const setTheme = useCallback((themeName: ThemeName) => {
    // 允许切换回 DefaultTheme（Base Theme）
    if (themeName === BASE_THEME_NAME || themeName === DEFAULT_THEME_NAME) {
      // 切换回 DefaultTheme：移除 Visual Theme 覆盖层
      setThemeState(BASE_THEME_NAME)
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
