/**
 * BaseLayout - 基础布局组件
 * 
 * 职责：
 * - 提供基础页面布局结构（Grid / Flex 方向）
 * - 定义容器宽度、侧边栏宽度、头部高度、页脚高度
 * - 管理布局相关的 CSS 变量
 * 
 * ⛔ 不属于 Theme 系统：
 * - 布局结构不属于 Theme，Theme 只控制视觉样式（颜色、字体、阴影、圆角）
 * - 布局结构通过组件控制，不通过 Theme 控制
 */

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface BaseLayoutProps {
  children: ReactNode
  className?: string
  /**
   * 容器最大宽度
   * @default '1280px'
   */
  maxWidth?: string
  /**
   * 是否居中
   * @default true
   */
  centered?: boolean
}

export function BaseLayout({
  children,
  className,
  maxWidth = '1280px',
  centered = true,
}: BaseLayoutProps) {
  return (
    <div
      className={cn(
        'w-full',
        centered && 'mx-auto',
        className,
      )}
      style={{
        maxWidth,
        // 布局相关的 CSS 变量（不属于 Theme）
        // 这些变量可以通过 props 或 CSS 覆盖
      }}
    >
      {children}
    </div>
  )
}

/**
 * 布局相关的 CSS 变量定义（应该在组件中使用，而不是在 Theme 中）
 * 
 * 这些变量可以通过 BaseLayout 组件的 props 控制，或者通过 CSS 覆盖
 */
export const LAYOUT_VARS = {
  containerMaxWidth: '1280px',
  sidebarWidth: '256px',
  headerHeight: '64px',
  footerHeight: '80px',
} as const
