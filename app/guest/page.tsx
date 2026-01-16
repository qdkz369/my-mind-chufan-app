"use client"

/**
 * 游客营销门户页面
 * 
 * 核心原则：
 * - 完全隔离，不引入任何业务组件（订单、资产、看板、审计相关）
 * - 只使用公开API（只读，无 audit_logs，无 trace_logs）
 * - 支持SEO（未来可被搜索引擎抓取）
 * - 主题：DefaultTheme（默认主题）- 在身份判定后初始化
 * 
 * 禁止：
 * - 不引入任何业务组件（IoTDashboard、InstallationAlert、RecentOrders等）
 * - 不 import 订单、资产、看板相关代码
 * - 不调用需要认证的API
 * - 不显示用户相关数据
 */

import { useEffect } from "react"
import { GuestHeader } from "@/components/guest-header"
import { GuestServices } from "@/components/guest-services"
import { BottomNavigation } from "@/components/bottom-navigation"
// THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
// import { useTheme } from "@/lib/styles/theme-context"

export default function GuestPage() {
  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  // const { setTheme, theme } = useTheme()

  // 主题初始化：在身份判定之后执行
  // 游客默认主题：DefaultTheme（通过 globals.css 的 :root 自动加载）
  /* useEffect(() => {
    // 确保主题系统在身份判定后初始化
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("ios-theme-preference") : null
    // DefaultTheme 会自动通过 globals.css 的 :root 加载，不需要手动设置
    console.log('[Guest Page] 游客页面加载，主题:', savedTheme || theme || 'default')
  }, [setTheme, theme]) */

  return (
    <main className="min-h-screen pb-20">
      <GuestHeader />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <GuestServices />
      </div>
      <BottomNavigation />
    </main>
  )
}
