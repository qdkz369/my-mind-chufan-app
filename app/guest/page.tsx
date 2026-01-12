"use client"

/**
 * 游客营销门户页面
 * 
 * 核心原则：
 * - 完全隔离，不引入任何业务组件（订单、资产、看板、审计相关）
 * - 只使用公开API（只读，无 audit_logs，无 trace_logs）
 * - 支持SEO（未来可被搜索引擎抓取）
 * - 主题：Apple White（信任/克制）- 在身份判定后初始化
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
import { useTheme } from "@/lib/styles/theme-context"

export default function GuestPage() {
  const { setTheme, theme } = useTheme()

  // 主题初始化：在身份判定之后执行
  // 游客默认主题：Apple White（信任/克制）
  useEffect(() => {
    // 确保主题系统在身份判定后初始化
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("ios-theme-preference") : null
    if (!savedTheme) {
      setTheme("apple-white") // 游客默认主题：Apple White（信任/克制）
    }
    console.log('[Guest Page] 游客页面加载，主题:', savedTheme || theme || "apple-white")
  }, [setTheme, theme])

  return (
    <main className="min-h-screen bg-background pb-20">
      <GuestHeader />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <GuestServices />
      </div>
      <BottomNavigation />
    </main>
  )
}
