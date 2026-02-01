"use client"


import { useEffect, useState } from "react"
// THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
// import { useTheme } from "@/lib/styles/theme-context"
import { Header } from "@/components/header"
import { IoTDashboard } from "@/components/iot-dashboard"
import { CoreServices } from "@/components/core-services"
import { BottomNavigation } from "@/components/bottom-navigation"
import { OrderTimeline } from "@/components/facts/OrderTimeline"
import { AssetFactCard } from "@/components/facts/AssetFactCard"
import { convertOrderFactsToTimelineViewModel, OrderTimelineViewModel } from "@/lib/facts-ui/orderTimeline.viewmodel"
import { convertAssetFactToCardViewModel, AssetCardViewModel } from "@/lib/facts-ui/assetCard.viewmodel"
import {
  adaptRestaurantOverview,
  adaptAssets,
  adaptOrderDetails,
} from "@/lib/facts/adapters"
import { Package, Clock, Activity, Truck } from "lucide-react"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { logBusinessWarning } from "@/lib/utils/logger"

interface RestaurantOverview {
  active_orders: number
  completed_orders: number
  active_assets: number
  last_delivery_at: string | null
}

export default function UserBoundPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  
  // 状态管理
  const [restaurantOverview, setRestaurantOverview] = useState<RestaurantOverview | null>(null)
  const [latestOrderTimeline, setLatestOrderTimeline] = useState<OrderTimelineViewModel | null>(null)
  const [assetsList, setAssetsList] = useState<AssetCardViewModel[]>([])
  const [isLoading, setIsLoading] = useState(false) // 强制初始值为 false，确保 UI 立即显示
  const [isDevicesDialogOpen, setIsDevicesDialogOpen] = useState(false)
  
  // 错误状态管理（用于 fallback UI）
  const [hasError, setHasError] = useState(false)
  const [errorType, setErrorType] = useState<'no_restaurant' | 'load_failed' | null>(null)

  // 确保组件已挂载后再使用 useTheme（避免 SSR 问题）
  useEffect(() => {
    setMounted(true)
    
    // ⚠️ 重要：标记此页面允许软错误（不触发 Cursor 错误弹窗）
    // 当此标记存在时，日志工具将只记录 warning，不触发错误弹窗
    if (typeof window !== 'undefined') {
      ;(window as any).__ALLOW_SOFT_ERRORS__ = true
    }
    
    // 组件卸载时清理标记（可选，但建议保留以确保其他页面不受影响）
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__ALLOW_SOFT_ERRORS__
      }
    }
  }, [])

  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  // 使用 useTheme（必须在组件顶层调用）
  // const themeContext = useTheme()

  // 主题初始化：在身份判定之后执行
  // 正式用户默认主题：Base Theme（Industrial Blue，通过 globals.css 的 :root 自动加载）
  // ⚠️ 注意：Base Theme 不允许通过 JavaScript 切换，会自动通过 CSS 加载
  /* useEffect(() => {
    if (!mounted) return
    
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("ios-theme-preference") : null
    // Base Theme 会自动通过 globals.css 的 :root 加载，不需要手动设置
    // 如果有保存的 Visual Theme（如 industrial-dark），会自动应用
    console.log('[User Bound Page] 正式用户页面加载，主题:', savedTheme || 'base (industrial-blue)')
  }, [mounted]) */

  // 获取 restaurant_id 并加载事实数据
  useEffect(() => {
    // ⚠️ 重要：确保 async 函数不会返回 rejected Promise
    // 所有错误都在内部处理，不向外抛出
    const loadFactData = async (): Promise<void> => {
      try {
        // 1. 从 localStorage 获取 restaurant_id
        const savedRestaurantId = typeof window !== "undefined" 
          ? localStorage.getItem("restaurantId") 
          : null

        if (!savedRestaurantId) {
          console.warn('[User Bound Page] 未找到 restaurantId，无法加载事实数据')
          setErrorType('no_restaurant')
          setHasError(true)
          setIsLoading(false)
          return
        }
        
        // 重置错误状态
        setHasError(false)
        setErrorType(null)

        // 2. 获取餐厅事实总览
        // 注意：必须在请求头中传递 x-restaurant-id 以进行权限验证
        try {
          const overviewResponse = await fetch(`/api/facts/restaurant/${savedRestaurantId}/overview`, {
            headers: {
              "x-restaurant-id": savedRestaurantId,
            },
          })
          if (overviewResponse.ok) {
            const overviewData = await overviewResponse.json()
            // ⚠️ 重要：使用 Adapter 处理 API 响应，确保数据安全
            // ViewModel 不允许再直接读取 API response
            const adaptedOverview = adaptRestaurantOverview(overviewData)
            setRestaurantOverview(adaptedOverview)
          } else if (overviewResponse.status === 401 || overviewResponse.status === 403) {
            logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
          }
        } catch (error) {
          // ⚠️ 重要：catch 中不抛出 error，不返回 rejected Promise
          logBusinessWarning('User Bound Page', '获取餐厅事实总览失败', error)
          // 设置 fallback UI state（degraded：部分数据加载失败）
          // 不设置 hasError，允许继续加载其他数据
        }

        // 3. 获取关联资产列表（先获取，因为订单事实 API 也会返回资产）
        // 注意：必须在请求头中传递 x-restaurant-id 以进行权限验证
        try {
          const assetsResponse = await fetch(`/api/facts/restaurant/${savedRestaurantId}/assets`, {
            headers: {
              "x-restaurant-id": savedRestaurantId,
            },
          })
          if (assetsResponse.ok) {
            const assetsData = await assetsResponse.json()
            // ⚠️ 重要：使用 Adapter 处理 API 响应，确保数据安全
            // Adapter 保证返回的始终是数组（空数组也可）
            const adaptedAssets = adaptAssets(assetsData)
            
            // Facts → ViewModel 转换（在 page 层完成）
            // 注意：adaptedAssets 已经是安全的 AssetFactContract[]，无需再次过滤
            try {
              const assetViewModels = adaptedAssets.map(convertAssetFactToCardViewModel)
              setAssetsList(assetViewModels)
            } catch (error) {
              console.warn('[User Bound Page] 转换资产卡片 ViewModel 失败:', {
                error,
                restaurant_id: savedRestaurantId,
                assets_count: adaptedAssets.length,
                trace_id: `asset-list-${Date.now()}`,
              })
            }
          } else if (assetsResponse.status === 401 || assetsResponse.status === 403) {
            logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
          }
        } catch (error) {
          // ⚠️ 重要：catch 中不抛出 error，不返回 rejected Promise
          logBusinessWarning('User Bound Page', '获取关联资产列表失败', error)
          // 设置 fallback UI state（degraded：部分数据加载失败）
          // 不设置 hasError，允许继续加载其他数据
        }

        // 4. 获取最近一次配送订单的事实数据（包括时间线和资产）
        // 注意：必须在请求头中传递 x-restaurant-id 以进行权限验证
        try {
          // 先获取最近一次完成的订单 ID
          const latestOrderResponse = await fetch(`/api/facts/restaurant/${savedRestaurantId}/latest-order`, {
            headers: {
              "x-restaurant-id": savedRestaurantId,
            },
          })
          if (latestOrderResponse.ok) {
            const latestOrderData = await latestOrderResponse.json()
            if (latestOrderData.success && latestOrderData.order_id) {
              // 调用订单事实 API 获取完整信息
              // 注意：订单事实 API 会验证订单的 restaurant_id 是否与请求头中的 restaurantId 匹配
              const orderFactResponse = await fetch(`/api/facts/orders/${latestOrderData.order_id}`, {
                headers: {
                  "x-restaurant-id": savedRestaurantId,
                },
              })
              if (orderFactResponse.ok) {
                const orderFactData = await orderFactResponse.json()
                // ⚠️ 重要：使用 Adapter 处理 API 响应，确保数据安全
                // Adapter 保证：
                // - 缺失字段提供默认值
                // - 时间字段做安全校验（非法 → null）
                // - 数组字段保证始终为数组（空数组也可）
                const adaptedOrderDetails = adaptOrderDetails(orderFactData)
                
                // 提取并显示 fact_warnings（事实治理警告）
                if (adaptedOrderDetails.fact_warnings.length > 0) {
                  console.warn('[User Bound Page] 发现事实不一致警告:', adaptedOrderDetails.fact_warnings)
                  // 使用 toast 进行非阻塞式提醒
                  adaptedOrderDetails.fact_warnings.forEach((warning: string) => {
                    toast({
                      title: "事实不一致警告",
                      description: warning,
                      variant: "default", // 使用默认样式，不阻塞用户操作
                      duration: 5000, // 5秒后自动消失
                    })
                  })
                }
                
                // Facts → ViewModel 转换（在 page 层完成）
                // 注意：adaptedOrderDetails.order 已经是安全的 OrderFactContract | null
                // adaptedOrderDetails.traces 已经是安全的 TraceFactContract[]
                if (adaptedOrderDetails.order) {
                  try {
                    const timelineViewModel = convertOrderFactsToTimelineViewModel(
                      adaptedOrderDetails.order,
                      adaptedOrderDetails.traces
                    )
                    setLatestOrderTimeline(timelineViewModel)
                  } catch (error) {
                    console.warn('[User Bound Page] 转换订单时间线 ViewModel 失败:', {
                      error,
                      restaurant_id: savedRestaurantId,
                      order_id: adaptedOrderDetails.order.order_id,
                      traces_count: adaptedOrderDetails.traces.length,
                      trace_id: `order-timeline-${Date.now()}`,
                    })
                  }
                }
                
                // 将订单关联的资产与现有资产列表合并（去重）
                // 注意：adaptedOrderDetails.assets 已经是安全的 AssetFactContract[]
                if (adaptedOrderDetails.assets.length > 0) {
                  try {
                    const newAssetViewModels = adaptedOrderDetails.assets.map(convertAssetFactToCardViewModel)
                    setAssetsList((prev) => {
                      const existingIds = new Set(prev.map((a: AssetCardViewModel) => a.assetId))
                      const newAssets = newAssetViewModels.filter(
                        (a: AssetCardViewModel) => !existingIds.has(a.assetId)
                      )
                      return [...prev, ...newAssets]
                    })
                  } catch (error) {
                    console.warn('[User Bound Page] 转换订单关联资产 ViewModel 失败:', {
                      error,
                      restaurant_id: savedRestaurantId,
                      order_id: adaptedOrderDetails.order?.order_id,
                      assets_count: adaptedOrderDetails.assets.length,
                      trace_id: `order-assets-${Date.now()}`,
                    })
                  }
                }
              } else if (orderFactResponse.status === 401 || orderFactResponse.status === 403) {
                logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
              }
            }
          } else if (latestOrderResponse.status === 401 || latestOrderResponse.status === 403) {
            logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
          }
        } catch (error) {
          // ⚠️ 重要：catch 中不抛出 error，不返回 rejected Promise
          logBusinessWarning('User Bound Page', '获取最近一次配送失败', error)
          // 设置 fallback UI state（degraded：部分数据加载失败）
          // 不设置 hasError，允许继续加载其他数据
        }

      } catch (error) {
        // ⚠️ 重要：catch 中不抛出 error，不返回 rejected Promise
        logBusinessWarning('User Bound Page', '加载事实数据失败', error)
        // 设置 fallback UI state（load_failed：数据加载失败）
        setErrorType('load_failed')
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    // ⚠️ 重要：确保 async 函数调用不会导致未捕获的 Promise rejection
    // 使用 void 明确表示忽略返回值，并确保所有错误都在内部处理
    void loadFactData().catch((error) => {
      // 最后的兜底：如果 loadFactData 内部有任何未捕获的错误，在这里处理
      // 这种情况理论上不应该发生，因为所有错误都在内部 catch 了
      logBusinessWarning('User Bound Page', 'loadFactData 未预期的错误', error)
      setErrorType('load_failed')
      setHasError(true)
      setIsLoading(false)
    })
  }, [])

  // ⚠️ 重要：禁止在 render 阶段直接 throw
  // 所有错误都通过状态管理，返回 fallback UI

  // Fallback UI：无餐厅 ID
  if (errorType === 'no_restaurant') {
    return (
      <main className="min-h-screen pb-20" style={{ backgroundColor: 'transparent' }}>
        <Header />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-transparent flex flex-col md:flex-col">
          <Card semanticLevel="primary_fact" cardEffect="glow-soft" className="glass-card p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center" style={{ backgroundColor: 'transparent' }}>
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">未绑定餐厅</h2>
              <p className="text-sm text-muted-foreground mb-4">请先绑定餐厅以查看事实数据</p>
              <Link href="/user-unbound">
                <Button>前往绑定页面</Button>
              </Link>
            </div>
          </Card>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  // Fallback UI：数据加载失败（degraded state）
  if (hasError && errorType === 'load_failed' && !isLoading) {
    return (
      <main className="min-h-screen pb-20" style={{ backgroundColor: 'transparent' }}>
        <Header />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-transparent flex flex-col md:flex-col">
          <Card semanticLevel="primary_fact" cardEffect="glow-soft" className="glass-card p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center" style={{ backgroundColor: 'transparent' }}>
              <Activity className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">数据加载失败</h2>
              <p className="text-sm text-muted-foreground mb-4">部分数据可能无法显示，请稍后重试</p>
              <Button onClick={() => window.location.reload()}>刷新页面</Button>
            </div>
          </Card>
        </div>
        <BottomNavigation />
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-20" style={{ backgroundColor: 'transparent' }}>
      <Header />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-transparent flex flex-col md:flex-col">
        {/* 完整IoT Dashboard - 实时数据 */}
        <IoTDashboard onDeviceClick={() => setIsDevicesDialogOpen(true)} />

        {/* 核心服务 */}
        <CoreServices />

        {/* 事实数据区域 */}
        <div className="space-y-6 bg-transparent">
          {/* 最近订单（只显示状态） */}
          <Card semanticLevel="primary_fact" cardEffect="glow-soft" className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4" style={{ backgroundColor: 'transparent' }}>
              <div className="w-10 h-10 bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30" style={{ borderRadius: 'var(--radius-button)' }}>
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div style={{ backgroundColor: 'transparent' }}>
                <h2 className="text-lg font-semibold text-foreground">最近订单</h2>
                <p className="text-xs text-muted-foreground">只显示订单状态（事实）</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground" style={{ backgroundColor: 'transparent' }}>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            ) : restaurantOverview ? (
              <div className="grid grid-cols-2 gap-4" style={{ backgroundColor: 'transparent' }}>
                <div className="glass-card p-4" style={{ backgroundColor: 'transparent', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
                  <div className="text-xs text-muted-foreground mb-1">活跃订单</div>
                  <div className="text-2xl font-bold text-foreground">{restaurantOverview.active_orders ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1 opacity-60">accepted / delivering</div>
                </div>
                <div className="glass-card p-4" style={{ backgroundColor: 'transparent', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
                  <div className="text-xs text-muted-foreground mb-1">已完成订单</div>
                  <div className="text-2xl font-bold text-foreground">{restaurantOverview.completed_orders ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1 opacity-60">completed</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground" style={{ backgroundColor: 'transparent' }}>
                <span className="text-sm">暂无订单数据</span>
              </div>
            )}
          </Card>

          {/* 最近一次配送（OrderTimeline） */}
          {latestOrderTimeline && (
            <div style={{ backgroundColor: 'transparent' }}>
              <div className="flex items-center gap-3 mb-4" style={{ backgroundColor: 'transparent' }}>
                <div className="w-10 h-10 bg-linear-to-br from-success to-emerald-600 flex items-center justify-center shadow-lg shadow-success/30" style={{ borderRadius: 'var(--radius-button)' }}>
                  <Clock className="w-5 h-5 text-success-foreground" />
                </div>
                <div style={{ backgroundColor: 'transparent' }}>
                  <h2 className="text-lg font-semibold text-foreground">最近一次配送</h2>
                  <p className="text-xs text-muted-foreground">订单事实时间线</p>
                </div>
              </div>
              <OrderTimeline viewModel={latestOrderTimeline} />
            </div>
          )}

          {/* 关联资产对话框 */}
          <Dialog open={isDevicesDialogOpen} onOpenChange={setIsDevicesDialogOpen}>
            <DialogContent className="glass-card max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30" style={{ borderRadius: 'var(--radius-button)' }}>
                    <Activity className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">关联资产列表</h2>
                    <p className="text-xs text-muted-foreground">资产事实卡片</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              {assetsList.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4 mt-4" style={{ backgroundColor: 'transparent' }}>
                  {assetsList.map((assetViewModel) => (
                    <AssetFactCard 
                      key={assetViewModel.assetId} 
                      viewModel={assetViewModel}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground" style={{ backgroundColor: 'transparent' }}>
                  <span className="text-sm">暂无关联资产</span>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* 如果餐厅总览显示有活跃资产，但资产列表为空，显示提示 */}
          {!isLoading && restaurantOverview && (restaurantOverview.active_assets ?? 0) > 0 && assetsList.length === 0 && (
            <Card semanticLevel="secondary_fact" cardEffect="glow-soft" className="glass-card p-6">
              <div className="flex items-center justify-center py-8 text-muted-foreground" style={{ backgroundColor: 'transparent' }}>
                <Activity className="w-5 h-5 mr-2" />
                <span className="text-sm">活跃资产数量: {restaurantOverview.active_assets ?? 0}（资产详情加载中...）</span>
              </div>
            </Card>
          )}
        </div>
      </div>
      <BottomNavigation />
    </main>
  )
}
