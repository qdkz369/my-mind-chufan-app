"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Wrench,
  Activity,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function DevicesPage() {
  const router = useRouter()
  const [devices, setDevices] = useState<Array<{
    device_id: string
    model: string | null
    address: string | null
    installer: string | null
    install_date: string | null
    status: string | null
    created_at: string | null
  }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) // 初始化状态：正在读取 localStorage
  const [error, setError] = useState("")
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  // 路由保护：检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsLoggedIn(false)
        router.push('/')
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          // 游客访问，重定向到首页
          setIsLoggedIn(false)
          router.push('/')
          return
        }
        setIsLoggedIn(true)
      } catch (error) {
        console.error("[设备页面] 检查登录状态失败:", error)
        setIsLoggedIn(false)
        router.push('/')
      }
    }

    checkAuth()
  }, [router])

  // 首先读取 localStorage 中的 restaurantId
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsInitializing(false)
      return
    }
    
    // 立即读取，避免延迟
    const rid = localStorage.getItem("restaurantId")
    setRestaurantId(rid)
    setIsInitializing(false) // 标记初始化完成
  }, [])

  // 读取到 restaurantId 后再加载设备数据
  useEffect(() => {
    // 如果还在初始化，不执行
    if (isInitializing) return

    if (!restaurantId || !supabase) {
      if (!restaurantId) {
        setError("请先登录")
      } else {
        setError("数据库连接失败")
      }
      setIsLoading(false)
      return
    }

    const loadDevices = async () => {
      try {
        setIsLoading(true)
        setError("")

        // 查询所有已激活的设备
        const { data: devicesData, error: devicesError } = await supabase
          .from("devices")
          .select("device_id, model, address, installer, install_date, status, created_at")
          .eq("restaurant_id", restaurantId)
          .in("status", ["active", "online"])
          .order("install_date", { ascending: false })

        if (devicesError) {
          console.error("查询设备失败:", devicesError)
          setError("查询设备失败")
          return
        }

        setDevices(devicesData || [])
      } catch (err: any) {
        console.error("加载设备失败:", err)
        setError(err.message || "加载失败")
      } finally {
        setIsLoading(false)
      }
    }

    loadDevices()
  }, [restaurantId])

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            已激活
          </Badge>
        )
      case "online":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Activity className="h-3 w-3 mr-1" />
            在线
          </Badge>
        )
      case "offline":
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            <AlertCircle className="h-3 w-3 mr-1" />
            离线
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status || "未知"}
          </Badge>
        )
    }
  }

  // 如果未登录，不渲染页面内容（等待重定向）
  if (isLoggedIn === false) {
    return (
      <main className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-foreground">正在跳转...</div>
      </main>
    )
  }

  // 如果登录状态还在检查中，显示加载中
  if (isLoggedIn === null) {
    return (
      <main className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">检查权限中...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />

      {/* 页面标题 */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted/50">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">我的设备</h1>
            <p className="text-sm text-muted-foreground">查看已激活的设备列表</p>
          </div>
        </div>

        {/* 加载中（包括初始化阶段） */}
        {(isLoading || isInitializing) && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">加载中...</p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && !isLoading && !isInitializing && (
          <Card className="theme-card p-6 mb-6 border-destructive/30 bg-destructive/10">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <h3 className="text-lg font-bold text-destructive mb-1">加载失败</h3>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* 设备列表 */}
        {!isLoading && !isInitializing && !error && (
          <>
            {devices.length === 0 ? (
              <Card className="theme-card p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-muted/50 flex items-center justify-center mx-auto mb-4 border border-border" style={{ borderRadius: 'var(--radius-card)' }}>
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">暂无设备</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    您还没有已激活的设备
                  </p>
                  <Link href="/customer/confirm">
                    <Button className="theme-button bg-primary hover:bg-primary/90 text-primary-foreground">
                      前往确认验收
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    共 {devices.length} 台设备
                  </p>
                </div>

                {devices.map((device) => (
                  <Card
                    key={device.device_id}
                    className="theme-card p-6 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-foreground">
                              {device.device_id}
                            </h3>
                            {getStatusBadge(device.status)}
                          </div>
                          {device.model && (
                            <p className="text-sm text-muted-foreground mb-1">
                              型号: {device.model}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-border/50">
                      {device.address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-0.5">安装地址</p>
                            <p className="text-sm text-foreground">{device.address}</p>
                          </div>
                        </div>
                      )}

                      {device.installer && (
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-0.5">安装人</p>
                            <p className="text-sm text-foreground">{device.installer}</p>
                          </div>
                        </div>
                      )}

                      {device.install_date && (
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-0.5">安装日期</p>
                            <p className="text-sm text-foreground">
                              {new Date(device.install_date).toLocaleString("zh-CN")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNavigation />
    </main>
  )
}

