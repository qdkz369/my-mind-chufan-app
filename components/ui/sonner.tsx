'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'
// THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
// import { useTheme } from '@/lib/styles/theme-context'

/**
 * Toaster 组件
 * 
 * 使用我们的主题系统（而不是 next-themes）
 * 只消费语义化 token，不感知具体主题
 */
const Toaster = ({ ...props }: ToasterProps) => {
  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  // const { theme } = useTheme()
  
  // 将我们的主题名称映射到 Sonner 的主题
  // Base Theme (base) → 'dark' (因为 Base Theme 是深色)
  // Visual Themes (apple-white) → 'light'
  // const sonnerTheme: ToasterProps['theme'] = theme === 'apple-white' ? 'light' : 'dark'
  const sonnerTheme: ToasterProps['theme'] = 'dark' // 主题系统已禁用，使用固定值

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
