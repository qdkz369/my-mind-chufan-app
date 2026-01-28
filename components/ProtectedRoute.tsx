"use client"

/**
 * ProtectedRoute - 路由保护组件
 *
 * 用法：包裹需要登录才能访问的子组件，未登录时重定向到 /login。
 *
 * ⚠️ 重要：切勿在 JSX 中直接渲染 user 或 userContext 对象！
 * 错误示例：{user}、{userContext} 会触发 "Cannot convert object to primitive value"。
 * 正确示例：{userContext?.userId}、{user?.email} 等仅渲染原始值。
 */

import { useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: ReactNode
  /** 未登录时跳转路径，默认 /login */
  redirectTo?: string
  /** 加载中时占位内容；不传则显示默认加载态 */
  fallback?: ReactNode
}

export function ProtectedRoute({
  children,
  redirectTo = "/login",
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  useEffect(() => {
    let cancelled = false

    async function checkAuth() {
      try {
        const res = await fetch("/api/user/context", { credentials: "include" })
        const data = await res.json().catch(() => ({}))

        if (cancelled) return

        if (res.ok && data?.success && data?.data) {
          setStatus("authenticated")
        } else {
          setStatus("unauthenticated")
          router.replace(redirectTo)
        }
      } catch {
        if (!cancelled) {
          setStatus("unauthenticated")
          router.replace(redirectTo)
        }
      }
    }

    checkAuth()
    return () => {
      cancelled = true
    }
  }, [router, redirectTo])

  if (status === "loading") {
    if (fallback !== undefined) return <>{fallback}</>
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">验证登录状态...</span>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  return <>{children}</>
}
