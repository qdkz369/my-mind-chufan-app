'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  BASE_THEME_NAME,
  VisualThemeName,
  VISUAL_THEMES,
  SWITCHABLE_VISUAL_THEMES,
  THEME_STORAGE_KEY,
  getVisualThemeCSSVariables,
  detectStructuralTokens,
} from './themes'
import { logThemeChange } from '@/lib/utils/logger'

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
  // 初始状态：默认使用 Industrial Dark 主题
  const [theme, setThemeState] = useState<ThemeName>('industrial-dark')

  // ============================================================================
  // 软隔离：DOM 写入操作已禁用
  // 以下代码块包含所有 document.documentElement.setAttribute 调用
  // 已被注释包裹，但代码保留以便后续恢复
  // ============================================================================
  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  // 初始化：应用保存的主题，如果没有保存的主题则使用默认主题（industrial-dark）
  /* useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement

    // 检查是否有保存的主题
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as VisualThemeName | null
    const isFirstVisit = savedTheme === null

    if (isFirstVisit) {
      // 首次访问：使用默认主题（industrial-dark）
      const defaultThemeName: VisualThemeName = 'industrial-dark'
      const defaultThemeConfig = VISUAL_THEMES[defaultThemeName]
      const defaultCssVars = getVisualThemeCSSVariables(defaultThemeConfig)
      
      // 🔒 硬边界保护：验证（双重检查）
      const detectedStructuralTokens = detectStructuralTokens(defaultCssVars)
      if (detectedStructuralTokens.length > 0) {
        console.warn(
          `[ThemeLoader] 默认主题 "${defaultThemeName}" 的 CSS 变量中包含 Structural Tokens，已自动过滤：`,
          detectedStructuralTokens
        )
      }
      
      // 设置 data-theme 属性（用于 CSS 选择器）
      root.setAttribute('data-theme', defaultThemeName)
      
      // 注入默认主题的 CSS 变量
      root.setAttribute('style', defaultCssVars)
      
      setThemeState(defaultThemeName)
      // 保存默认主题到 localStorage
      localStorage.setItem(THEME_STORAGE_KEY, defaultThemeName)
    } else if (savedTheme && SWITCHABLE_VISUAL_THEMES.includes(savedTheme) && VISUAL_THEMES[savedTheme]) {
      // 有保存的主题：应用保存的主题
      const visualThemeConfig = VISUAL_THEMES[savedTheme]
      const visualCssVars = getVisualThemeCSSVariables(visualThemeConfig)
      
      // 🔒 硬边界保护：验证（双重检查）
      const detectedStructuralTokens = detectStructuralTokens(visualCssVars)
      if (detectedStructuralTokens.length > 0) {
        console.warn(
          `[ThemeLoader] 主题 "${savedTheme}" 的 CSS 变量中包含 Structural Tokens，已自动过滤：`,
          detectedStructuralTokens
        )
      }
      
      // 设置 data-theme 属性（用于 CSS 选择器）
      root.setAttribute('data-theme', savedTheme)
      
      // 注入主题的 CSS 变量
      root.setAttribute('style', visualCssVars)
      
      setThemeState(savedTheme)
    } else {
      // 保存的主题无效：清除无效主题，使用默认主题（industrial-dark）
      const defaultThemeName: VisualThemeName = 'industrial-dark'
      const defaultThemeConfig = VISUAL_THEMES[defaultThemeName]
      const defaultCssVars = getVisualThemeCSSVariables(defaultThemeConfig)
      
      root.setAttribute('data-theme', defaultThemeName)
      root.setAttribute('style', defaultCssVars)
      
      setThemeState(defaultThemeName)
      localStorage.setItem(THEME_STORAGE_KEY, defaultThemeName)
    }
  }, []) */

  // ============================================================================
  // 软隔离：DOM 写入操作已禁用
  // applyVisualTheme 函数包含 document.documentElement.setAttribute 调用
  // 已被注释包裹，但代码保留以便后续恢复
  // ============================================================================
  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  // 应用 Visual Theme（作为覆盖层叠加在 Base Theme 之上）
  /* const applyVisualTheme = useCallback((themeName: VisualThemeName) => {
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
    
    // 🔒 硬边界保护：再次验证（双重检查）
    const detectedStructuralTokens = detectStructuralTokens(visualCssVars)
    if (detectedStructuralTokens.length > 0) {
      console.warn(
        `[ThemeLoader] 主题 "${themeName}" 的 CSS 变量中包含 Structural Tokens，已自动过滤：`,
        detectedStructuralTokens
      )
    }
    
    root.setAttribute('data-theme', themeName)
    console.log('[THEME APPLIED]', themeName)
    root.setAttribute('style', visualCssVars)
    
    // 保存到 localStorage（仅用于 Visual Theme）
    localStorage.setItem(THEME_STORAGE_KEY, themeName)
  }, []) */

  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  // 主题变化时应用
  /* useEffect(() => {
    // 应用 Visual Theme
    applyVisualTheme(theme as VisualThemeName)
  }, [theme, applyVisualTheme]) */

  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  const setTheme = useCallback((themeName: ThemeName) => {
    // 主题系统已禁用，不执行任何操作
    console.warn('[ThemeProvider] 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式')
    /* const previousTheme = theme
    
    // 只允许切换 Visual Themes（industrial-dark）
    if (SWITCHABLE_VISUAL_THEMES.includes(themeName as VisualThemeName)) {
      setThemeState(themeName)
      // ⚠️ 主题切换日志（必须可追踪）
      logThemeChange(previousTheme, themeName, '切换主题', {
        source: 'setTheme',
      })
    } else {
      console.warn('[ThemeProvider] 无效的主题名称:', themeName)
    } */
  }, [theme])

  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  const value: ThemeContextType = {
    theme,
    // themeConfig: VISUAL_THEMES[theme as VisualThemeName] || null,
    themeConfig: null, // 主题系统已禁用
    setTheme,
    // availableThemes: SWITCHABLE_VISUAL_THEMES,
    availableThemes: [], // 主题系统已禁用
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
