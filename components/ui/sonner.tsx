'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'
import { useTheme } from '@/lib/styles/theme-context'

/**
 * Toaster 组件
 * 
 * 使用我们的主题系统（而不是 next-themes）
 * 只消费语义化 token，不感知具体主题
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  
  // 将我们的主题名称映射到 Sonner 的主题
  // Base Theme (base) → 'dark' (因为 Base Theme 是深色)
  // Visual Themes (apple-white) → 'light'
  const sonnerTheme: ToasterProps['theme'] = theme === 'apple-white' ? 'light' : 'dark'

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
