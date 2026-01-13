/**
 * Layout 组件导出
 * 
 * 提供布局结构相关的组件：
 * - BaseLayout：基础布局组件（容器宽度、居中）
 * - DashboardLayout：仪表板布局组件（侧边栏 + 主内容区）
 * 
 * ⛔ 不属于 Theme 系统：
 * - 布局结构不属于 Theme，Theme 只控制视觉样式（颜色、字体、阴影、圆角）
 */

export { BaseLayout, LAYOUT_VARS } from './BaseLayout'
export type { BaseLayoutProps } from './BaseLayout'

export { DashboardLayout } from './DashboardLayout'
export type { DashboardLayoutProps } from './DashboardLayout'
