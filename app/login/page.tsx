"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Shield, AlertCircle, CheckCircle2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null) // 登录成功提示
  const [isChecking, setIsChecking] = useState(true)
  const hasCheckedRef = useRef(false) // 使用 ref 防止重复检查
  const isRedirectingRef = useRef(false) // 防止重复跳转

  // 检查是否已登录（简化版：只检查 session，不查询角色，避免循环）
  // 注意：完全移除初始检查，让中间件处理所有重定向逻辑
  // 这样可以避免循环，因为中间件和前端检查可能冲突
  useEffect(() => {
    // 只设置检查完成，不进行任何检查
    // 让中间件和登录流程自己处理重定向
    setIsChecking(false)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 防止重复提交
    if (isLoading || isRedirectingRef.current) {
      console.warn("[登录页] 登录正在进行中或正在跳转，忽略重复请求")
      return
    }

    setError(null)
    setSuccess(null) // 清除之前的成功提示
    setIsLoading(true)

    try {
      // 使用统一的 Supabase 客户端实例，避免多个实例导致状态不同步
      if (!supabase) {
        throw new Error("Supabase 未初始化")
      }

      console.log("[登录页] 开始登录流程...")

      // 登录 - 使用统一的 Supabase 客户端实例
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (authError) {
        console.error("[登录页] 登录失败:", authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error("登录失败：未获取到用户信息")
      }

      console.log("[登录页] 登录成功，用户ID:", authData.user.id)

      // 检查用户角色
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle()

      // 详细调试信息
      console.log("[登录页] 角色查询结果:", {
        roleData,
        roleDataType: typeof roleData,
        roleDataIsArray: Array.isArray(roleData),
        roleDataRole: roleData?.role,
        roleError,
        user_id: authData.user.id
      })

      // 如果查询失败或没有角色记录
      if (roleError) {
        console.error("[登录页] 查询角色失败:", roleError)
        if (roleError.code === '42501' || roleError.code === 'PGRST301') {
          throw new Error("权限配置错误，请联系系统管理员")
        }
        throw new Error("查询用户角色失败，请重试")
      }

      if (!roleData) {
        console.warn("[登录页] 用户没有角色记录，需要管理员分配")
        console.warn("[登录页] 用户ID:", authData.user.id)
        throw new Error("您还没有被分配角色，请联系系统管理员")
      }

      // 处理可能的数组格式（虽然使用了 maybeSingle，但以防万一）
      const actualRole = Array.isArray(roleData) ? roleData[0]?.role : roleData.role
      
      console.log("[登录页] 用户角色详情:", {
        roleData,
        actualRole,
        isSuperAdmin: actualRole === "super_admin",
        isAdmin: actualRole === "admin",
        roleMatch: actualRole === "super_admin" || actualRole === "admin"
      })

      if (actualRole !== "super_admin" && actualRole !== "admin") {
        console.warn("[登录页] 用户不是管理员，当前角色:", actualRole)
        console.warn("[登录页] 需要 super_admin 或 admin 角色，但当前是:", actualRole || "未定义")
        await supabase.auth.signOut()
        throw new Error(`您没有管理员权限（当前角色：${actualRole || "无"}），请联系系统管理员`)
      }

      // 登录成功，确保会话已激活
      console.log("[登录页] 登录成功，验证会话状态...")
      
      // 等待一段时间，确保认证状态已完全同步到所有 Supabase 客户端实例
      // 这对于解决 "Multiple GoTrueClient instances" 警告导致的状态不同步问题很重要
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 验证会话状态（最多重试3次）
      let verifyRetryCount = 0
      let verifiedUser = authData.user
      
      while (verifyRetryCount < 3) {
        const { data: { user }, error: verifyError } = await supabase.auth.getUser()
        
        if (verifyError || !user) {
          if (verifyRetryCount < 2) {
            console.log(`[登录页] 会话验证失败，重试中... (${verifyRetryCount + 1}/3)`)
            await new Promise(resolve => setTimeout(resolve, 500))
            verifyRetryCount++
            continue
          }
          console.error("[登录页] 会话验证失败:", verifyError)
          throw new Error("会话验证失败，请重试")
        }
        
        verifiedUser = user
        break
      }

      console.log("[登录页] 会话已验证，用户:", verifiedUser.email)
      
      // 显示成功提示
      setSuccess("登录成功！正在跳转到管理后台...")
      
      // 再等待一小段时间，确保认证状态完全同步到所有组件
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 防止重复跳转
      if (!isRedirectingRef.current) {
        isRedirectingRef.current = true
        // 使用 window.location.href 进行完整页面跳转，避免React路由冲突
        // 这样可以确保所有组件完全卸载，避免DOM操作冲突
        window.location.href = "/dashboard"
      }
      
    } catch (err: any) {
      console.error("[登录页] 登录失败:", err)
      setError(err.message || "登录失败，请检查邮箱和密码")
      setIsLoading(false) // 确保重置加载状态
      isRedirectingRef.current = false // 重置跳转标记
    }
    // 注意：如果成功跳转，不会执行到这里
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">检查登录状态...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">管理员登录</CardTitle>
          <CardDescription className="text-center">
            请输入您的管理员账号和密码
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
