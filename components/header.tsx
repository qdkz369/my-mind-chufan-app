"use client"

import { useState, useEffect } from "react"
import { Bell, Search, Zap, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QRCodeDialog } from "@/components/qr-code-dialog"
import { SearchDialog } from "@/components/search-dialog"
import { NotificationDialog } from "@/components/notification-dialog"
// THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
// import { useTheme } from "@/lib/styles/theme-context"
import { supabase } from "@/lib/supabase"
import { logBusinessWarning } from "@/lib/utils/logger"

export function Header() {
  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  // const { theme } = useTheme()
  // const isAppleWhite = theme === 'apple-white'
  const isAppleWhite = false // 主题系统已禁用，使用固定值
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)
  const [hasDevices, setHasDevices] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)

  // 加载餐厅信息
  useEffect(() => {
    const loadRestaurantInfo = async () => {
      if (typeof window === 'undefined') return

      const rid = localStorage.getItem("restaurantId")
      if (!rid) {
        setRestaurantId(null)
        setHasDevices(false)
        return
      }

      setRestaurantId(rid)

      // 查询餐厅信息
      if (supabase) {
        try {
          const { data: restaurantData } = await supabase
            .from("restaurants")
            .select("id, name")
            .eq("id", rid)
            .maybeSingle()

          if (restaurantData) {
            setRestaurantName(restaurantData.name || null)
          }

          // 查询设备数量
          const { data: devicesData } = await supabase
            .from("devices")
            .select("device_id")
            .eq("restaurant_id", rid)
            .limit(1)

          setHasDevices(Boolean(devicesData && devicesData.length > 0))
        } catch (error) {
          logBusinessWarning('Header', '加载餐厅信息失败', error)
        }
      }
    }

    loadRestaurantInfo()
  }, [])

  // 加载未读通知数量（容错处理，失败不影响页面）
  useEffect(() => {
    if (!restaurantId) {
      setUnreadNotificationCount(0)
      return
    }

    const loadUnreadCount = async () => {
      try {
        const response = await fetch(
          `/api/notifications?restaurant_id=${restaurantId}&unread_only=true&limit=1`
        )
        
        // 即使响应不是 200，也尝试解析 JSON（容错处理）
        let result
        try {
          result = await response.json()
        } catch (parseError) {
          console.warn("[Header] 解析通知响应失败（容错处理）:", parseError)
          setUnreadNotificationCount(0)
          return
        }
        
        if (result.success) {
          setUnreadNotificationCount(result.unread_count || 0)
        } else {
          // 如果返回错误，设置为0，不阻断页面
          setUnreadNotificationCount(0)
        }
      } catch (error) {
        // 容错处理：任何错误都不影响页面，只记录警告
        console.warn("[Header] 加载未读通知数量失败（容错处理，不影响页面）:", error)
        setUnreadNotificationCount(0)
      }
    }

    loadUnreadCount()

    // 每30秒刷新一次未读数量
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [restaurantId])

  // 二维码图标样式：根据主题和是否有设备
  const qrIconClassName = restaurantId
    ? hasDevices
      ? isAppleWhite
        ? "text-foreground drop-shadow-[0_0_4px_rgba(0,0,0,0.1)]" // 苹果白模式：深灰色，带微弱阴影
        : "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" // 工业蓝模式：浅蓝色，呼吸灯效果
      : isAppleWhite
        ? "text-muted-foreground" // 苹果白模式：深灰色（无设备）
        : "text-muted-foreground" // 工业蓝模式：灰色（无设备）
    : "hidden" // 未登录时不显示

  const qrButtonHoverClassName = restaurantId
    ? hasDevices
      ? isAppleWhite
        ? "hover:bg-muted/50"
        : "hover:bg-blue-500/10 hover:text-blue-300"
      : isAppleWhite
        ? "hover:bg-muted/50"
        : "hover:bg-muted/50"
    : ""

  return (
    <>
      <header className="sticky top-0 z-50 bg-transparent backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-red-500/30" style={{ borderRadius: 'var(--radius-button)' }}>
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">我的智能餐厅</h1>
                <p className="text-xs text-muted-foreground">IoT智能餐饮服务平台</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {restaurantId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQRDialog(true)}
                  className={`${qrIconClassName} ${qrButtonHoverClassName} transition-all`}
                  title="客户身份二维码"
                >
                  <QrCode className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-muted/50"
                onClick={() => setShowSearchDialog(true)}
                title="搜索"
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-muted/50 relative"
                onClick={() => setShowNotificationDialog(true)}
                title="通知"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs border-0">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>
      <QRCodeDialog
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
        restaurantId={restaurantId}
        restaurantName={restaurantName}
      />
      <SearchDialog
        open={showSearchDialog}
        onOpenChange={setShowSearchDialog}
        restaurantId={restaurantId}
      />
      <NotificationDialog
        open={showNotificationDialog}
        onOpenChange={setShowNotificationDialog}
        restaurantId={restaurantId}
      />
    </>
  )
}
