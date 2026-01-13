/**
 * 全局主题系统
 * 
 * 核心架构：
 * - Base Theme：不可覆盖的基础主题，只定义视觉样式的默认值
 * - Visual Themes：可切换的视觉主题，只能覆盖颜色、圆角、阴影、字体
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
 * - 行高（line-height）→ 设计系统基础变量（不属于 Theme，部分在 density.css 中）
 * - 间距（spacing）→ 设计系统基础变量（不属于 Theme，部分在 density.css 中）
 * - 层级（z-index）→ 设计系统基础变量（不属于 Theme）
 * 
 * ⚠️ 重要说明：
 * - Base Theme 不允许被切换、不参与主题选择
 * - 所有 Visual Themes 都基于 Base Theme 构建
 * - 布局结构、卡片层级、组件密度等信息不属于 Theme 系统
 */

/**
 * Base Theme Token（视觉样式的默认值）
 * 
 * ⚠️ 已废弃：BaseThemeTokens 接口已不再使用
 * Theme 系统现在只通过 CSS 变量和 VisualThemeTokens 定义
 * 
 * @deprecated 此接口保留仅为向后兼容，实际不再使用
 */
export interface BaseThemeTokens {
  // ⛔ 这些字段已从 Theme 系统移除，不再使用
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
  }
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
  lineHeight: {
    tight: string
    normal: string
    relaxed: string
  }
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
 * - 只定义视觉样式的默认值（颜色、字体、阴影、圆角）
 * - 不允许被切换、不参与主题选择
 * - 所有 Visual Themes 都基于 Base Theme 构建
 * 
 * ⚠️ 重要：
 * - Base Theme 的视觉样式定义在 globals.css 的 :root 中
 * - 此对象已废弃，保留仅为向后兼容
 * - 布局结构、卡片层级、组件密度等不属于 Theme 系统
 * 
 * @deprecated 此对象已不再使用，Theme 系统现在只通过 CSS 变量定义
 */
export const BASE_THEME_TOKENS: BaseThemeTokens = {
  // ⛔ 这些字段已从 Theme 系统移除，不再使用
  // 保留仅为向后兼容
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
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
 * Default Theme 标识
 * 
 * 核心原则：
 * - DefaultTheme 是系统默认主题，不可删除、不可关闭
 * - DefaultTheme 对应 Base Theme 的视觉样式（深色背景、高对比、高密度、最少装饰）
 * - 所有用户首次进入系统时强制使用 DefaultTheme
 * - DefaultTheme 不参与主题切换，始终作为基础存在
 */
export const DEFAULT_THEME_NAME = 'default' as const

/**
 * Visual Theme 类型定义
 */
export type VisualThemeName = 'apple-white' | 'industrial-dark'

export interface VisualThemeConfig {
  name: VisualThemeName
  displayName: string
  description: string
  tokens: VisualThemeTokens
}

/**
 * Visual Themes（可切换的视觉主题）
 * 
 * ✅ 允许覆盖：
 * - 颜色（colors）- 只改变颜色值，不改变语义
 * - 字体（font-family）- 只改变字体家族，不改变字体大小
 * - 阴影（shadows）- 只改变阴影样式，不改变布局结构
 * - 圆角（border-radius）- 只改变圆角大小，不改变卡片高度
 * 
 * ⛔ 严格禁止：
 * - 严禁修改布局结构（Grid / Flex 方向）
 * - 严禁修改卡片信息层级（标题 / 主数值 / 辅助说明）
 * - 严禁修改组件密度（padding / gap）
 * - 严禁修改信息显示顺序
 * - 严禁修改字体大小（font-size）
 * - 严禁修改行高（line-height）
 * - 严禁修改间距（spacing）
 * - 严禁修改层级（z-index）
 * - 严禁修改卡片高度（card height）
 * - 严禁修改数据字号层级（font-size hierarchy）
 * - 严禁修改模块拆分方式（module structure）
 * 
 * ⚠️ 核心原则：
 * - 确保同一页面在 DefaultTheme 与 AppleTheme 下，信息数量与位置完全一致
 * - 只改变视觉样式，不改变布局结构
 */
export const VISUAL_THEMES: Record<VisualThemeName, VisualThemeConfig> = {
  'apple-white': {
    name: 'apple-white',
    displayName: 'Apple White',
    description: '苹果白 - #F2F2F7背景，更大圆角，SF Pro字体，柔和阴影，更浅色彩',
    tokens: {
      colors: {
        background: '#F2F2F7', // iOS系统背景色（更浅）
        backgroundSecondary: '#FFFFFF',
        card: '#FFFFFF', // 纯白面板/卡片（更浅）
        popover: '#FFFFFF',
        foreground: '#1D1D1F', // SF Pro感深色文字（纯深黑）
        foregroundSecondary: '#86868B', // 增强对比度
        primary: '#007AFF', // iOS系统蓝色（更浅）
        primaryForeground: '#FFFFFF',
        secondary: '#F5F5F7', // 更浅的次要色
        secondaryForeground: '#1D1D1F',
        accent: '#007AFF', // 更浅的强调色
        accentForeground: '#FFFFFF',
        muted: '#F5F5F7', // 更浅的静音色
        mutedForeground: '#86868B',
        border: '#E5E5EA', // 极淡边框（更浅）
        input: '#E5E5EA',
        ring: '#007AFF',
        destructive: '#FF3B30', // iOS红色（更浅）
        destructiveForeground: '#FFFFFF',
        success: '#34C759', // iOS绿色（更浅）
        successForeground: '#FFFFFF',
        warning: '#FF9500', // iOS橙色（更浅）
        warningForeground: '#FFFFFF',
        glass: 'rgba(255, 255, 255, 0.7)', // 毛玻璃效果（更浅）
        glassBorder: 'rgba(255, 255, 255, 0.18)',
      },
      borderRadius: {
        // ⚠️ 重要：圆角可以更大，但不能影响卡片高度
        // 圆角只影响视觉样式，不改变布局结构
        card: '1.5rem', // 24px 更大圆角（Squircle感），但不改变卡片高度
        button: '1.5rem',
        input: '1.5rem',
        small: '1rem',
      },
      shadows: {
        // ⚠️ 重要：阴影更柔和，但不改变布局结构
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // 更柔和的阴影
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        // ⚠️ 重要：只改变字体家族（SF 系），不改变字体大小
        sans: 'ui-sans-serif, system-ui, -apple-system, "SF Pro Display", "SF Pro Text", sans-serif',
        serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',
      },
    },
  },
  'industrial-dark': {
    name: 'industrial-dark',
    displayName: 'Industrial Dark',
    description: '深色工业 - 深蓝灰渐变背景，高对比数据，高信息密度，最少装饰',
    tokens: {
      colors: {
        // 背景色（深蓝灰渐变，最暗层）
        background: '#0A1628', // 深色背景（非纯黑，偏蓝灰）
        backgroundSecondary: '#0F1B2E', // 次要背景（稍亮，用于渐变）
        
        // 卡片色（稍亮层）- 使用 rgba 保持层次感
        card: 'rgba(20, 31, 53, 0.95)', // 卡片背景（轻微透明度，保持层次）
        popover: 'rgba(20, 31, 53, 0.98)', // 弹出层（更不透明）
        
        // 前景色（文字）- 高对比
        foreground: '#E5E8ED', // 主文字（高对比）
        foregroundSecondary: '#8B94A6', // 次要文字
        
        // 主色 - 高对比蓝色
        primary: '#3B82F6', // 蓝色主色（高对比）
        primaryForeground: '#FFFFFF',
        
        // 次要色（分隔区层，更亮）
        secondary: '#1E293B', // 次要背景（分隔区，比卡片稍亮）
        secondaryForeground: '#E5E8ED',
        
        // 强调色
        accent: '#60A5FA', // 蓝色强调色
        accentForeground: '#FFFFFF',
        
        // 静音色
        muted: '#1E293B', // 静音背景（与分隔区同层）
        mutedForeground: '#8B94A6',
        
        // 边框（分隔区层）
        border: '#1E293B', // 边框（与分隔区同层，保持层次）
        input: '#1E293B', // 输入框背景
        ring: '#3B82F6', // 焦点环
        
        // 状态色 - 高对比
        destructive: '#EF4444', // 红色（高对比）
        destructiveForeground: '#FFFFFF',
        success: '#10B981', // 绿色（高对比）
        successForeground: '#FFFFFF',
        warning: '#F59E0B', // 橙色（高对比）
        warningForeground: '#FFFFFF',
        
        // 毛玻璃效果
        glass: 'rgba(20, 31, 53, 0.7)', // 毛玻璃背景
        glassBorder: 'rgba(59, 130, 246, 0.2)', // 毛玻璃边框
      },
      borderRadius: {
        // 小圆角（最少装饰）
        card: '0.25rem', // 4px - 最小圆角，减少装饰
        button: '0.25rem',
        input: '0.25rem',
        small: '0.25rem',
      },
      shadows: {
        // 深色主题的阴影（保持层次感）
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
      },
      fontFamily: {
        // 标准系统字体（保持与 DefaultTheme 一致）
        sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
 * - Base Theme 对应 DefaultTheme 的视觉样式
 */
export const BASE_THEME_NAME = 'base' as const

/**
 * DefaultTheme 配置
 * 
 * 设计原则：
 * - 背景、卡片、分隔区必须有明确亮度层级
 * - 不使用 Apple 风格的纯白/灰阶
 * - 保留深色渐变背景
 * - 卡片允许使用轻微透明度（rgba）或 gradient
 * 
 * 亮度层级（从暗到亮）：
 * 1. 背景层（最暗）：#0A1628 → #0F1B2E
 * 2. 卡片层（稍亮）：rgba(20, 31, 53, 0.95) 或 gradient
 * 3. 分隔区（更亮）：#1E293B
 * 
 * ⚠️ 重要：
 * - DefaultTheme 不可删除、不可关闭
 * - DefaultTheme 对应 Base Theme 的视觉样式（定义在 globals.css 的 :root 中）
 * - 所有用户首次进入系统时强制使用 DefaultTheme
 * - 仅恢复"原始 UI 的层次感"，不追求效果增强
 * - 确保完整覆盖所有页面使用的 CSS 变量
 */
export const DEFAULT_THEME_CONFIG = {
  name: DEFAULT_THEME_NAME,
  displayName: 'Default',
  description: '默认主题 - 深色背景、明确亮度层级、保留层次感',
  isDefault: true,
  isUndeletable: true,
  isUnclosable: true,
  
  /**
   * DefaultTheme 完整变量配置
   * 
   * 确保完整覆盖所有页面使用的 CSS 变量：
   * - 颜色变量（背景、前景、主色、次要色、状态色等）
   * - 圆角变量
   * - 图表颜色
   * - 侧边栏颜色
   * - 毛玻璃效果
   * 
   * 注意：这些变量的实际值定义在 globals.css 的 :root 中
   * 这里仅作为配置参考和文档说明
   */
  tokens: {
    colors: {
      // 背景色（最暗层）
      background: '#0A1628', // 深色背景（非纯黑，偏蓝灰）
      backgroundSecondary: '#0F1B2E', // 次要背景（稍亮，用于渐变）
      
      // 卡片色（稍亮层）- 使用 rgba 保持层次感
      card: 'rgba(20, 31, 53, 0.95)', // 卡片背景（轻微透明度，保持层次）
      cardForeground: '#E5E8ED', // 卡片文字（高对比）
      popover: 'rgba(20, 31, 53, 0.98)', // 弹出层（更不透明）
      popoverForeground: '#E5E8ED',
      
      // 前景色（文字）
      foreground: '#E5E8ED', // 主文字（高对比）
      foregroundSecondary: '#8B94A6', // 次要文字
      
      // 主色
      primary: '#3B82F6', // 蓝色主色（高对比）
      primaryForeground: '#FFFFFF',
      
      // 次要色（分隔区层，更亮）
      secondary: '#1E293B', // 次要背景（分隔区，比卡片稍亮）
      secondaryForeground: '#E5E8ED',
      
      // 强调色
      accent: '#60A5FA', // 蓝色强调色
      accentForeground: '#FFFFFF',
      
      // 静音色
      muted: '#1E293B', // 静音背景（与分隔区同层）
      mutedForeground: '#8B94A6',
      
      // 边框（分隔区层）
      border: '#1E293B', // 边框（与分隔区同层，保持层次）
      input: '#1E293B', // 输入框背景
      ring: '#3B82F6', // 焦点环
      
      // 状态色
      destructive: '#EF4444', // 红色（高对比）
      destructiveForeground: '#FFFFFF',
      success: '#10B981', // 绿色（高对比）
      successForeground: '#FFFFFF',
      warning: '#F59E0B', // 橙色（高对比）
      warningForeground: '#FFFFFF',
      
      // 毛玻璃效果
      glass: 'rgba(20, 31, 53, 0.7)', // 毛玻璃背景
      glassBorder: 'rgba(59, 130, 246, 0.2)', // 毛玻璃边框
      
      // 图表颜色
      chart1: '#3B82F6',
      chart2: '#60A5FA',
      chart3: '#10B981',
      chart4: '#F59E0B',
      chart5: '#EF4444',
      
      // 侧边栏
      sidebar: 'rgba(20, 31, 53, 0.95)', // 侧边栏（与卡片同层）
      sidebarForeground: '#E5E8ED',
      sidebarPrimary: '#3B82F6',
      sidebarPrimaryForeground: '#FFFFFF',
      sidebarAccent: '#1E293B', // 侧边栏强调（分隔区层）
      sidebarAccentForeground: '#E5E8ED',
      sidebarBorder: '#1E293B', // 侧边栏边框（分隔区层）
      sidebarRing: '#3B82F6',
    },
    borderRadius: {
      card: '0.25rem', // 4px - 最小圆角
      button: '0.25rem',
      input: '0.25rem',
      small: '0.25rem',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
    },
    fontFamily: {
      sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      mono: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace',
    },
  },
} as const

/**
 * 可切换的 Visual Themes 列表
 */
export const SWITCHABLE_VISUAL_THEMES: VisualThemeName[] = ['apple-white', 'industrial-dark']

/**
 * 兼容性：为了保持向后兼容，保留旧的类型定义
 * @deprecated 使用 VisualThemeName 替代
 */
export type ThemeName = VisualThemeName | typeof BASE_THEME_NAME
