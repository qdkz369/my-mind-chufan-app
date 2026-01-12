/**
 * 全局主题系统
 * 
 * 核心架构：
 * - Base Theme：不可覆盖的基础主题，只定义结构相关和语义 token 的默认值
 * - Visual Themes：可切换的视觉主题，只能覆盖颜色、圆角、阴影、字体
 * 
 * ⛔ 严格禁止：
 * - Visual Themes 严禁修改 spacing、layout、组件结构
 * - Base Theme 不允许被切换、不参与主题选择
 */

/**
 * Base Theme Token（结构相关和语义 token 的默认值）
 * 
 * 这些 token 是 Base Theme 的基础，不允许被 Visual Themes 覆盖
 */
export interface BaseThemeTokens {
  // Spacing（间距）- 禁止 Visual Themes 修改
  spacing: {
    xs: string      // 4px
    sm: string      // 8px
    md: string      // 16px
    lg: string      // 24px
    xl: string      // 32px
    '2xl': string   // 48px
    '3xl': string   // 64px
  }
  
  // Layout（布局）- 禁止 Visual Themes 修改
  layout: {
    containerMaxWidth: string
    sidebarWidth: string
    headerHeight: string
    footerHeight: string
  }
  
  // Typography Scale（字体大小）- 禁止 Visual Themes 修改
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
  }
  
  // Line Height（行高）- 禁止 Visual Themes 修改
  lineHeight: {
    tight: string
    normal: string
    relaxed: string
  }
  
  // Z-Index Scale（层级）- 禁止 Visual Themes 修改
  zIndex: {
    dropdown: number
    sticky: number
    fixed: number
    modal: number
    popover: number
    tooltip: number
  }
}

/**
 * Visual Theme Token（视觉相关，可被 Visual Themes 覆盖）
 */
export interface VisualThemeTokens {
  // 颜色（允许覆盖）
  colors: {
    // 背景色
    background: string
    backgroundSecondary: string
    card: string
    popover: string
    // 前景色（文字）
    foreground: string
    foregroundSecondary: string
    // 主色
    primary: string
    primaryForeground: string
    // 次要色
    secondary: string
    secondaryForeground: string
    // 强调色
    accent: string
    accentForeground: string
    // 静音色
    muted: string
    mutedForeground: string
    // 边框
    border: string
    input: string
    ring: string
    // 状态色
    destructive: string
    destructiveForeground: string
    success: string
    successForeground: string
    warning: string
    warningForeground: string
    // 毛玻璃效果
    glass: string
    glassBorder: string
  }
  
  // 圆角（允许覆盖，但建议保持与 Base Theme 一致）
  borderRadius: {
    card: string
    button: string
    input: string
    small: string
  }
  
  // 阴影（允许覆盖）
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  
  // 字体族（允许覆盖）
  fontFamily: {
    sans: string
    serif: string
    mono: string
  }
}

/**
 * Base Theme（不可覆盖的基础主题）
 * 
 * 核心原则：
 * - 只定义结构相关和语义 token 的默认值
 * - 不允许被切换、不参与主题选择
 * - 所有 Visual Themes 都基于 Base Theme 构建
 */
export const BASE_THEME_TOKENS: BaseThemeTokens = {
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
  },
  layout: {
    containerMaxWidth: '1280px',
    sidebarWidth: '256px',
    headerHeight: '64px',
    footerHeight: '80px',
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
}

/**
 * Visual Theme 类型定义
 */
export type VisualThemeName = 'apple-white'

export interface VisualThemeConfig {
  name: VisualThemeName
  displayName: string
  description: string
  tokens: VisualThemeTokens
}

/**
 * Visual Themes（可切换的视觉主题）
 * 
 * ⛔ 严格禁止：
 * - 严禁修改 spacing、layout、组件结构
 * - 只能覆盖颜色、圆角、阴影、字体
 */
export const VISUAL_THEMES: Record<VisualThemeName, VisualThemeConfig> = {
  'apple-white': {
    name: 'apple-white',
    displayName: 'Apple White',
    description: '苹果白 - #F2F2F7背景，24px圆角，SF Pro感，柔和阴影',
    tokens: {
      colors: {
        background: '#F2F2F7', // iOS系统背景色
        backgroundSecondary: '#FFFFFF',
        card: '#FFFFFF', // 纯白面板/卡片
        popover: '#FFFFFF',
        foreground: '#1D1D1F', // SF Pro感深色文字（纯深黑）
        foregroundSecondary: '#86868B', // 增强对比度
        primary: '#007AFF', // iOS系统蓝色
        primaryForeground: '#FFFFFF',
        secondary: '#F5F5F7',
        secondaryForeground: '#1D1D1F',
        accent: '#007AFF',
        accentForeground: '#FFFFFF',
        muted: '#F5F5F7',
        mutedForeground: '#86868B',
        border: '#E5E5EA', // 极淡边框
        input: '#E5E5EA',
        ring: '#007AFF',
        destructive: '#FF3B30', // iOS红色
        destructiveForeground: '#FFFFFF',
        success: '#34C759', // iOS绿色
        successForeground: '#FFFFFF',
        warning: '#FF9500', // iOS橙色
        warningForeground: '#FFFFFF',
        glass: 'rgba(255, 255, 255, 0.7)', // 毛玻璃效果
        glassBorder: 'rgba(255, 255, 255, 0.18)',
      },
      borderRadius: {
        card: '1.5rem', // 24px 全局圆角（Squircle感）
        button: '1.5rem',
        input: '1.5rem',
        small: '1rem',
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        sans: 'ui-sans-serif, system-ui, -apple-system, "SF Pro Display", "SF Pro Text", sans-serif',
        serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',
      },
    },
  },
}

/**
 * 主题存储键名
 */
export const THEME_STORAGE_KEY = 'ios-theme-preference'

/**
 * 获取 Visual Theme 的 CSS 变量
 * 
 * ⚠️ 重要：只返回视觉相关的 CSS 变量，不包含结构相关的变量
 * 
 * ⛔ 严格禁止包含的结构变量：
 * - --spacing-* (xs, sm, md, lg, xl, 2xl, 3xl)
 * - --layout-* (container-max-width, sidebar-width, header-height, footer-height)
 * - --font-size-* (xs, sm, base, lg, xl, 2xl, 3xl, 4xl)
 * - --line-height-* (tight, normal, relaxed)
 * - --z-index-* (dropdown, sticky, fixed, modal, popover, tooltip)
 * 
 * ✅ 允许包含的视觉变量：
 * - 颜色变量（--background, --foreground, --primary, --secondary, --accent, --muted, --border, --input, --ring, --destructive, --success, --warning）
 * - 圆角变量（--radius-card, --radius-button, --radius-input, --radius-small, --radius）
 * - 字体变量（--font-sans, --font-serif, --font-mono）
 * - 图表颜色（--chart-1 到 --chart-5）
 * - 侧边栏颜色（--sidebar-*）
 * - 毛玻璃效果（--glass, --glass-border）
 */
export function getVisualThemeCSSVariables(theme: VisualThemeConfig): string {
  return `
    --background: ${theme.tokens.colors.background};
    --background-secondary: ${theme.tokens.colors.backgroundSecondary};
    --foreground: ${theme.tokens.colors.foreground};
    --foreground-secondary: ${theme.tokens.colors.foregroundSecondary};
    --card: ${theme.tokens.colors.card};
    --card-foreground: ${theme.tokens.colors.foreground};
    --popover: ${theme.tokens.colors.popover};
    --popover-foreground: ${theme.tokens.colors.foreground};
    --primary: ${theme.tokens.colors.primary};
    --primary-foreground: ${theme.tokens.colors.primaryForeground};
    --secondary: ${theme.tokens.colors.secondary};
    --secondary-foreground: ${theme.tokens.colors.secondaryForeground};
    --accent: ${theme.tokens.colors.accent};
    --accent-foreground: ${theme.tokens.colors.accentForeground};
    --muted: ${theme.tokens.colors.muted};
    --muted-foreground: ${theme.tokens.colors.mutedForeground};
    --border: ${theme.tokens.colors.border};
    --input: ${theme.tokens.colors.input};
    --ring: ${theme.tokens.colors.ring};
    --destructive: ${theme.tokens.colors.destructive};
    --destructive-foreground: ${theme.tokens.colors.destructiveForeground};
    --success: ${theme.tokens.colors.success};
    --success-foreground: ${theme.tokens.colors.successForeground};
    --warning: ${theme.tokens.colors.warning};
    --warning-foreground: ${theme.tokens.colors.warningForeground};
    --glass: ${theme.tokens.colors.glass};
    --glass-border: ${theme.tokens.colors.glassBorder};
    --radius-card: ${theme.tokens.borderRadius.card};
    --radius-button: ${theme.tokens.borderRadius.button};
    --radius-input: ${theme.tokens.borderRadius.input};
    --radius-small: ${theme.tokens.borderRadius.small};
    --radius: ${theme.tokens.borderRadius.card};
    --font-sans: ${theme.tokens.fontFamily.sans};
    --font-serif: ${theme.tokens.fontFamily.serif};
    --font-mono: ${theme.tokens.fontFamily.mono};
  `
}

/**
 * Base Theme 标识
 * 
 * 核心原则：
 * - Base Theme 是唯一的基础主题，不允许被切换
 * - Base Theme 不参与主题选择
 * - Base Theme 始终作为默认主题应用
 */
export const BASE_THEME_NAME = 'base' as const

/**
 * 可切换的 Visual Themes 列表
 */
export const SWITCHABLE_VISUAL_THEMES: VisualThemeName[] = ['apple-white']

/**
 * 兼容性：为了保持向后兼容，保留旧的类型定义
 * @deprecated 使用 VisualThemeName 替代
 */
export type ThemeName = VisualThemeName | typeof BASE_THEME_NAME
