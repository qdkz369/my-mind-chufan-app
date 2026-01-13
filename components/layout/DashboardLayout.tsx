/**
 * DashboardLayout - 仪表板布局组件
 * 
 * 职责：
 * - 提供仪表板专用布局结构（侧边栏 + 主内容区）
 * - 管理 Grid / Flex 布局方向
 * - 定义侧边栏宽度、主内容区宽度
 * 
 * ⛔ 不属于 Theme 系统：
 * - 布局结构不属于 Theme，Theme 只控制视觉样式（颜色、字体、阴影、圆角）
 * - 布局结构通过组件控制，不通过 Theme 控制
 */

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import { LAYOUT_VARS } from './BaseLayout'

export interface DashboardLayoutProps {
  children: ReactNode
  className?: string
  /**
   * 侧边栏内容
   */
  sidebar?: ReactNode
  /**
   * 侧边栏宽度
   * @default '256px'
   */
  sidebarWidth?: string
  /**
   * 是否显示侧边栏
   * @default false
   */
  showSidebar?: boolean
}

export function DashboardLayout({
  children,
  className,
  sidebar,
  sidebarWidth = LAYOUT_VARS.sidebarWidth,
  showSidebar = false,
}: DashboardLayoutProps) {
  return (
    <div
      className={cn(
        'flex w-full',
        // Grid 布局：侧边栏 + 主内容区
        showSidebar && 'grid',
        className,
      )}
      style={
        showSidebar
          ? {
              gridTemplateColumns: `${sidebarWidth} 1fr`,
              // 布局方向：横向（默认）
              display: 'grid',
            }
          : {
              display: 'flex',
              flexDirection: 'column',
            }
      }
    >
      {showSidebar && sidebar && (
        <aside
          className="flex-shrink-0"
          style={{
            width: sidebarWidth,
            // 侧边栏布局：纵向
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {sidebar}
        </aside>
      )}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
