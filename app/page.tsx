"use client"

/**
 * ⚠️ 无状态访问：直接显示管理后台 UI，不进行任何重定向
 * 任何人都能直接看到管理后台界面
 */

// 直接导入并显示管理后台组件
import AdminDashboard from "@/app/(admin)/dashboard/page"

export default function HomePage() {
  // 直接渲染管理后台，不进行任何跳转
  return <AdminDashboard />
}
