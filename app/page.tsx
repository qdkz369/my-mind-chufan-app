"use client"

/**
 * 根路径入口调度器
 * 根据用户身份重定向到对应页面：
 * - 未登录 → /guest
 * - 管理员 → /dashboard
 * - 已登录但未绑定 → /user-unbound
 * - 已登录且已绑定 → /user-bound
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      // 检查 supabase 是否可用
      if (!supabase) {
        console.error("[入口调度器] Supabase 未初始化，重定向到 /guest")
        router.replace('/guest')
        return
      }

      // 将 supabase 赋值给局部常量，确保 TypeScript 类型收窄
      const supabaseClient = supabase

      try {
        console.log("[入口调度器] 开始检查用户身份...")

        // 第1步：是否已登录？
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        const restaurantId = typeof window !== "undefined" 
          ? localStorage.getItem("restaurantId") 
          : null

        console.log("[入口调度器] 登录状态:", {
          hasUser: !!user,
          authError: !!authError,
          hasRestaurantId: !!restaurantId
        })

        // 未登录且没有 restaurantId → 重定向到 /guest
        if ((!user || authError) && !restaurantId) {
          console.log("[入口调度器] 未登录，重定向到 /guest")
          router.replace('/guest')
          return
        }

        // 第2步：是否管理员角色？
        if (user && !authError) {
          const { data: roleData } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle()

          const role = roleData?.role
          console.log("[入口调度器] 用户角色:", role)

          // 如果是管理员角色 → 重定向到 /dashboard
          if (role === "super_admin" || role === "platform_admin") {
            console.log("[入口调度器] 管理员身份，重定向到 /dashboard")
            router.replace('/dashboard')
            return
          }
        }

        // 第3步：是否已绑定业务主体？
        if (!restaurantId) {
          console.log("[入口调度器] 未绑定业务主体，重定向到 /user-unbound")
          router.replace('/user-unbound')
          return
        }

        // 第4步：是否已绑定设备/资产？
        const { data: devices, error: devicesError } = await supabaseClient
          .from("devices")
          .select("device_id")
          .eq("restaurant_id", restaurantId)
          .limit(1)

        if (devicesError) {
          console.error("[入口调度器] 查询设备失败:", devicesError)
          // 查询失败时，默认重定向到未绑定页面
          router.replace('/user-unbound')
          return
        }

        if (!devices || devices.length === 0) {
          console.log("[入口调度器] 未绑定设备，重定向到 /user-unbound")
          router.replace('/user-unbound')
          return
        }

        // 第5步：默认 → /user-bound（已登录且已绑定）
        console.log("[入口调度器] 已绑定用户，重定向到 /user-bound")
        router.replace('/user-bound')

      } catch (error: any) {
        console.error("[入口调度器] 身份检查异常:", error)
        // 发生错误时，默认重定向到游客页面
        router.replace('/guest')
      } finally {
        setIsChecking(false)
      }
    }

    checkUserAndRedirect()
  }, [router])

  // 显示加载状态
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">正在检查身份...</p>
        </div>
      </div>
    )
  }

  // 重定向中，不渲染任何内容
  return null
}
