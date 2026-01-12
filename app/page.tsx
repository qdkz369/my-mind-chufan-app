"use client"

/**
 * 身份调度层 (Entry Resolver)
 * 
 * app/page.tsx（入口调度器）
 * ├─ 职责：只做调度，不渲染
 * ├─ 输入：用户身份与绑定状态
 * ├─ 输出：重定向到对应页面
 * └─ UI：仅最小化加载状态（占位）
 * 
 * 判断顺序（严格）：
 * 1. 是否已登录（Supabase Auth user 或 restaurantId）
 *    └─ 否 → /guest
 * 
 * 2. 是否管理员角色（基于 user_roles 表）
 *    └─ 是 → /dashboard
 * 
 * 3. 是否已绑定业务主体（restaurantId / companyId）
 *    └─ 否 → /user-unbound
 * 
 * 4. 是否已绑定设备/资产
 *    └─ 否 → /user-unbound（同一页面，状态不同）
 * 
 * 5. 默认 → /user-bound
 * 
 * 重定向目标：
 * ├─ /guest          → 游客营销门户
 * ├─ /user-unbound   → 已注册未绑定/离线态看板
 * ├─ /user-bound     → 正式用户事实看板
 * └─ /dashboard      → 管理后台
 * 
 * 核心原则：
 * - 页面 ≠ UI，页面 = "现实状态的投影"
 * - "设备未绑定"和"主体未绑定"属于同一类：已注册但尚未形成完整事实链
 * - 一旦入口判断混乱，后面所有"事实 / 异常 / 责任"都会被污染
 * 
 * 禁止：
 * - 在页面里写 if/else 切内容
 * - 一个页面承担多个身份
 * - 直接渲染UI组件
 * 
 * 允许：
 * - 身份判断逻辑
 * - redirect 到对应的身份页面
 * - 加载状态（最小化UI）
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { SplashScreen } from "@/components/splash-screen"
import { motion } from "framer-motion"

export default function HomePage() {
  const router = useRouter()
  const [isResolving, setIsResolving] = useState(true)
  const [showSplash, setShowSplash] = useState(true)

  // 检查是否应该显示启动动画（首次加载或每次启动时）
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 检查 localStorage 中是否已标记为"已显示过启动动画"
      // 如果需要每次启动都显示，可以移除这个检查
      const hasSeenSplash = localStorage.getItem("hasSeenSplash")
      
      // 如果需要每次启动都显示，注释掉下面这行
      // if (hasSeenSplash === "true") {
      //   setShowSplash(false)
      // }
    }
  }, [])

  useEffect(() => {
    // 备用超时机制：防止身份验证无限等待（10秒后强制停止加载）
    const timeoutId = setTimeout(() => {
      console.warn('[Entry Resolver] 身份验证超时，强制停止加载')
      setIsResolving(false)
      // 如果还在根路径，重定向到游客页面
      if (typeof window !== "undefined" && window.location.pathname === "/") {
        router.replace('/guest')
      }
    }, 10000)

    const resolveIdentity = async () => {
      try {
        // 核心原则：app/page.tsx 只拦 /，不拦其他页面
        // 确保所有页面都允许被直接访问，避免重定向回环
        if (typeof window !== "undefined") {
          const pathname = window.location.pathname
          
          // 只对根路径 / 执行身份调度，其他所有路径都允许直接访问
          if (pathname !== "/") {
            console.log(`[Entry Resolver] 当前路径为 ${pathname}，非根路径，跳过身份调度（允许直接访问）`)
            clearTimeout(timeoutId)
            setIsResolving(false)
            return
          }
          
          console.log('[Entry Resolver] 访问根路径 /，执行身份调度')
        }

        // 判断顺序（严格）：确保身份判断的严谨性
        // 页面 = "现实状态的投影"，一旦入口判断混乱，后面所有"事实 / 异常 / 责任"都会被污染
        
        if (!supabase) {
          console.log('[Entry Resolver] Supabase未初始化，重定向到游客页面')
          clearTimeout(timeoutId)
          router.replace('/guest')
          return
        }

        // 第1步：是否已登录（Supabase Auth user）
        // 注意：客户端用户通过手机号登录，只有 restaurantId，没有 Supabase Auth user
        // 但在严格顺序中，先检查 Supabase Auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        // 调试日志：确认身份识别
        console.log('[Entry Resolver] 身份判定:', {
          hasUser: !!user,
          userId: user?.id || null,
          email: user?.email || null,
          authError: authError?.message || null,
          timestamp: new Date().toISOString()
        })

        // 检查客户端登录状态（restaurantId）- 客户端用户通过手机号登录
        const restaurantId = typeof window !== "undefined" 
          ? localStorage.getItem("restaurantId") 
          : null

        // 如果既没有 Supabase Auth user，也没有 restaurantId，说明未登录 → /guest
        // 注意：这是对"是否已登录"的完整判断，包括两种登录方式（Supabase Auth 和客户端手机号登录）
        if ((!user || authError) && !restaurantId) {
          console.log('[Entry Resolver] 步骤1：未登录（无Supabase Auth且无restaurantId） → /guest')
          clearTimeout(timeoutId)
          router.replace('/guest')
          return
        }

        // 第2步：如果有 Supabase Auth user，检查是否管理员角色（基于 user_roles 表）
        // 注意：管理员也可能有 restaurantId，但优先判断为管理员
        if (user && !authError) {
          try {
            const { data: roleData, error: roleError } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id)
              .maybeSingle()

            if (!roleError && roleData) {
              const actualRole = Array.isArray(roleData) ? roleData[0]?.role : roleData.role
              
              // 如果是管理员角色（super_admin 或 admin），重定向到管理后台
              if (actualRole === "super_admin" || actualRole === "admin") {
                console.log('[Entry Resolver] 步骤2：管理员角色 → /dashboard')
                clearTimeout(timeoutId)
                router.replace('/dashboard')
                return
              }
            }
          } catch (roleCheckError) {
            console.error('[Entry Resolver] 检查管理员角色失败:', roleCheckError)
            // 角色检查失败，继续后续流程（不直接判定为游客）
          }
        }

        // 第3步：是否已绑定业务主体（restaurant/company）
        // 如果没有绑定业务主体 → /user-unbound
        // 注意：这里判断的是客户端用户（通过手机号登录，有 restaurantId）
        // "主体未绑定"和"设备未绑定"属于同一类：已注册但尚未形成完整事实链
        if (!restaurantId) {
          console.log('[Entry Resolver] 步骤3：未绑定业务主体（restaurantId） → /user-unbound')
          clearTimeout(timeoutId)
          router.replace('/user-unbound')
          return
        }

        // 第4步：是否已绑定设备/资产
        // 注意："设备未绑定"和"主体未绑定"属于同一类：已注册但尚未形成完整事实链
        try {
          const { data: devices, error: deviceError } = await supabase
            .from("devices")
            .select("device_id")
            .eq("restaurant_id", restaurantId)
            .limit(1)

          const hasDevice = !deviceError && devices && devices.length > 0

          // 如果没有绑定设备/资产 → /user-unbound（与未绑定主体同一页面）
          if (!hasDevice) {
            console.log('[Entry Resolver] 步骤4：未绑定设备/资产 → /user-unbound')
            clearTimeout(timeoutId)
            router.replace('/user-unbound')
            return
          }
        } catch (deviceCheckError) {
          console.error('[Entry Resolver] 检查设备绑定状态失败:', deviceCheckError)
          // 查询失败时，视为未绑定设备 → /user-unbound
          clearTimeout(timeoutId)
          router.replace('/user-unbound')
          return
        }

        // 第5步：默认 → /user-bound（已登录、非管理员、已绑定主体、已绑定设备）
        console.log('[Entry Resolver] 步骤5：正式用户（已绑定主体和设备） → /user-bound')
        clearTimeout(timeoutId)
        router.replace('/user-bound')

      } catch (error) {
        console.error('[Entry Resolver] 身份判定失败:', error)
        // 发生错误时，默认重定向到游客页面（最安全的选择）
        clearTimeout(timeoutId)
        router.replace('/guest')
      } finally {
        clearTimeout(timeoutId)
        setIsResolving(false)
      }
    }

    resolveIdentity()

    // 清理函数：组件卸载时清除超时
    return () => {
      clearTimeout(timeoutId)
    }

    // 监听认证状态变化，自动重新判定身份
    // 注意：只有访问根路径 / 时才会设置监听器，避免在非根路径上触发重定向
    if (supabase && typeof window !== "undefined" && window.location.pathname === "/") {
      const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event, session) => {
        console.log('[Entry Resolver] 认证状态变化:', event, session?.user?.id || null)
        
        // 只有在根路径 / 上时，才重新判定身份
        if (typeof window !== "undefined" && window.location.pathname === "/") {
          // 当登录/登出事件发生时，重新判定身份
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            await resolveIdentity()
          }
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [router])

  // 启动动画完成后，标记为已显示
  const handleSplashComplete = () => {
    setShowSplash(false)
    if (typeof window !== "undefined") {
      localStorage.setItem("hasSeenSplash", "true")
    }
  }

  // 如果显示启动动画，优先显示启动动画
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  // 最小化加载UI（仅用于身份判定期间的占位）
  // 使用灶小蜂微缩版动态 Logo，与启动动画视觉统一
  if (isResolving) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          {/* 灶小蜂微缩版动态 Logo */}
          <div className="relative w-16 h-16 flex items-center justify-center mx-auto">
            <motion.img
              src="/assets/chef-bee-logo.svg"
              alt="灶小蜂 Logo"
              className="relative z-10 w-16 h-16"
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ 
                scale: [0.9, 1, 0.9],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* 微缩版能量波纹（单道，持续循环） */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: "64px",
                height: "64px",
                border: "1.5px solid",
                borderColor: "var(--accent, #007AFF)",
                boxShadow: `
                  0 0 0 0 var(--accent, #007AFF),
                  0 0 6px var(--accent, #007AFF),
                  0 0 12px rgba(var(--accent-rgb, 0, 122, 255), 0.4)
                `,
              }}
              initial={{
                scale: 0.8,
                opacity: 0.6,
              }}
              animate={{
                scale: [0.8, 1.5, 0.8],
                opacity: [0.6, 0.3, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
          <p className="text-muted-foreground text-sm">正在验证身份...</p>
        </div>
      </div>
    )
  }

  // 理论上不应该到达这里（应该已经redirect），但提供fallback
  return null
}
