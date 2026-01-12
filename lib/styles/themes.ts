/**
 * 全局主题系统
 * 定义两套互斥主题：Industrial Blue（工业蓝/默认）、Apple White（苹果白/复刻版）
 */

export type ThemeName = 'industrial-blue' | 'apple-white'

export interface ThemeConfig {
  name: ThemeName
  displayName: string
  description: string
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
  // 圆角规范
  borderRadius: {
    card: string
    button: string
    input: string
    small: string
  }
}

export const themes: Record<ThemeName, ThemeConfig> = {
  'industrial-blue': {
    name: 'industrial-blue',
    displayName: 'Industrial Blue',
    description: '工业蓝 - 深工业蓝/暗色调，硬朗直线，高对比度',
    colors: {
      background: '#0A1628', // 深工业蓝背景
      backgroundSecondary: '#0F1B2E',
      card: '#141F35', // 高对比度面板
      popover: '#141F35',
      foreground: '#E5E8ED', // 纯白或亮青
      foregroundSecondary: '#8B94A6',
      primary: '#3B82F6', // 亮蓝色
      primaryForeground: '#FFFFFF',
      secondary: '#1E293B',
      secondaryForeground: '#E5E8ED',
      accent: '#60A5FA',
      accentForeground: '#FFFFFF',
      muted: '#1E293B',
      mutedForeground: '#8B94A6',
      border: '#1E293B', // 硬朗边框
      input: '#1E293B',
      ring: '#3B82F6',
      destructive: '#EF4444',
      destructiveForeground: '#FFFFFF',
      success: '#10B981',
      successForeground: '#FFFFFF',
      warning: '#F59E0B',
      warningForeground: '#FFFFFF',
      glass: 'rgba(20, 31, 53, 0.7)',
      glassBorder: 'rgba(59, 130, 246, 0.2)',
    },
    borderRadius: {
      card: '0.25rem', // 4px 小圆角
      button: '0.25rem',
      input: '0.25rem',
      small: '0.25rem',
    },
  },
  'apple-white': {
    name: 'apple-white',
    displayName: 'Apple White',
    description: '苹果白 - #F2F2F7背景，24px圆角，SF Pro感，柔和阴影',
    colors: {
      background: '#F2F2F7', // iOS系统背景色（保持）
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
      mutedForeground: '#86868B', // 增强对比度，从 #6E6E73 改为 #86868B
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
  },
}

// 主题存储键名
export const THEME_STORAGE_KEY = 'ios-theme-preference'

// 获取主题CSS变量
export function getThemeCSSVariables(theme: ThemeConfig): string {
  return `
    --background: ${theme.colors.background};
    --background-secondary: ${theme.colors.backgroundSecondary};
    --foreground: ${theme.colors.foreground};
    --foreground-secondary: ${theme.colors.foregroundSecondary};
    --card: ${theme.colors.card};
    --card-foreground: ${theme.colors.foreground};
    --popover: ${theme.colors.popover};
    --popover-foreground: ${theme.colors.foreground};
    --primary: ${theme.colors.primary};
    --primary-foreground: ${theme.colors.primaryForeground};
    --secondary: ${theme.colors.secondary};
    --secondary-foreground: ${theme.colors.secondaryForeground};
    --accent: ${theme.colors.accent};
    --accent-foreground: ${theme.colors.accentForeground};
    --muted: ${theme.colors.muted};
    --muted-foreground: ${theme.colors.mutedForeground};
    --border: ${theme.colors.border};
    --input: ${theme.colors.input};
    --ring: ${theme.colors.ring};
    --destructive: ${theme.colors.destructive};
    --destructive-foreground: ${theme.colors.destructiveForeground};
    --success: ${theme.colors.success};
    --success-foreground: ${theme.colors.successForeground};
    --warning: ${theme.colors.warning};
    --warning-foreground: ${theme.colors.warningForeground};
    --glass: ${theme.colors.glass};
    --glass-border: ${theme.colors.glassBorder};
    --radius-card: ${theme.borderRadius.card};
    --radius-button: ${theme.borderRadius.button};
    --radius-input: ${theme.borderRadius.input};
    --radius-small: ${theme.borderRadius.small};
  `
}

// 默认主题：Industrial Blue（工业蓝/原版）
export const defaultTheme: ThemeName = 'industrial-blue'
