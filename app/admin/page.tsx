"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()

  useEffect(() => {
    // 自动重定向到 /dashboard 页面
    router.push("/dashboard")
  }, [router])

  // 显示加载状态
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
        <p className="text-slate-400">正在跳转到管理看板...</p>
      </div>
    </div>
  )
}
