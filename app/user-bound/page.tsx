"use client"

/**
 * 正式用户事实主页
 * 
 * 核心原则：
 * - 只允许在 /user-bound 页面使用事实组件
 * - 不做"看板"，只做"事实呈现"
 * - 使用事实聚合 API（Read-Only）
 * - 主题：Midnight（专业/操作）- 在身份判定后初始化
 * 
 * 页面结构：
 * 用户事实主页
 * ├─ 今日订单（只显示状态）
 * ├─ 最近一次配送（OrderTimeline）
 * ├─ 关联资产列表（AssetFactCard）
 * 
 * 明确禁止在其他页面使用事实组件：
 * - /guest（禁止）
 * - /user-unbound（禁止）
 * - /dashboard（暂不接，禁止）
 */

import { useEffect, useState } from "react"
import { useTheme } from "@/lib/styles/theme-context"
import { Header } from "@/components/header"
import { IoTDashboard } from "@/components/iot-dashboard"
import { BottomNavigation } from "@/components/bottom-navigation"
import { OrderTimeline } from "@/components/facts/OrderTimeline"
import { AssetFactCard } from "@/components/facts/AssetFactCard"
import { convertOrderFactsToTimelineViewModel, OrderTimelineViewModel } from "@/lib/facts-ui/orderTimeline.viewmodel"
import { convertAssetFactToCardViewModel, AssetCardViewModel } from "@/lib/facts-ui/assetCard.viewmodel"
import { Package, Clock, Activity, Truck } from "lucide-react"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

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
  const [isLoading, setIsLoading] = useState(true)
  const [isDevicesDialogOpen, setIsDevicesDialogOpen] = useState(false)

  // 确保组件已挂载后再使用 useTheme（避免 SSR 问题）
  useEffect(() => {
    setMounted(true)
  }, [])

  // 使用 useTheme（必须在组件顶层调用）
  const themeContext = useTheme()

  // 主题初始化：在身份判定之后执行
  // 正式用户默认主题：Base Theme（Industrial Blue，通过 globals.css 的 :root 自动加载）
  // ⚠️ 注意：Base Theme 不允许通过 JavaScript 切换，会自动通过 CSS 加载
  useEffect(() => {
    if (!mounted) return
    
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("ios-theme-preference") : null
    // Base Theme 会自动通过 globals.css 的 :root 加载，不需要手动设置
    // 如果有保存的 Visual Theme（如 apple-white），会自动应用
    console.log('[User Bound Page] 正式用户页面加载，主题:', savedTheme || 'base (industrial-blue)')
  }, [mounted])

  // 获取 restaurant_id 并加载事实数据
  useEffect(() => {
    const loadFactData = async () => {
      try {
        // 1. 从 localStorage 获取 restaurant_id
        const savedRestaurantId = typeof window !== "undefined" 
          ? localStorage.getItem("restaurantId") 
          : null

        if (!savedRestaurantId) {
          console.warn('[User Bound Page] 未找到 restaurantId，无法加载事实数据')
          setIsLoading(false)
          return
        }

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
            if (overviewData.success) {
              // 确保数据具有默认值，避免 null/undefined 导致渲染错误
              setRestaurantOverview({
                active_orders: overviewData.active_orders ?? 0,
                completed_orders: overviewData.completed_orders ?? 0,
                active_assets: overviewData.active_assets ?? 0,
                last_delivery_at: overviewData.last_delivery_at ?? null,
              })
            }
          } else if (overviewResponse.status === 401 || overviewResponse.status === 403) {
            console.error('[User Bound Page] 权限验证失败，请确保已登录')
          }
        } catch (error) {
          console.error('[User Bound Page] 获取餐厅事实总览失败:', error)
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
            if (assetsData.success && assetsData.assets && Array.isArray(assetsData.assets)) {
              // Facts → ViewModel 转换（在 page 层完成）
              // 确保每个资产数据有效，避免转换函数出错
              try {
                const assetViewModels = assetsData.assets
                  .filter((asset: any) => asset && typeof asset === 'object' && asset.asset_id)
                  .map(convertAssetFactToCardViewModel)
                setAssetsList(assetViewModels)
              } catch (error) {
                console.error('[User Bound Page] 转换资产卡片 ViewModel 失败:', error)
              }
            }
          } else if (assetsResponse.status === 401 || assetsResponse.status === 403) {
            console.error('[User Bound Page] 权限验证失败，请确保已登录')
          }
        } catch (error) {
          console.error('[User Bound Page] 获取关联资产列表失败:', error)
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
                // 确保响应数据有效，避免 null/undefined 导致渲染错误
                if (orderFactData.success && orderFactData.order) {
                  // 调试日志：验证前端是否真实接收到这些事实字段
                  console.log("ORDER_FACT_FROM_API", orderFactData.order)
                  console.log("ORDER_FACT_FIELDS_CHECK", {
                    "accepted_at_exists": orderFactData.order.accepted_at !== undefined,
                    "completed_at_exists": orderFactData.order.completed_at !== undefined,
                    "accepted_at_value": orderFactData.order.accepted_at || null,
                    "completed_at_value": orderFactData.order.completed_at || null,
                    "accepted_at_type": typeof orderFactData.order.accepted_at,
                    "completed_at_type": typeof orderFactData.order.completed_at,
                    "order_keys": Object.keys(orderFactData.order),
                  })
                  
                  // 提取并显示 fact_warnings（事实治理警告）
                  if (orderFactData.fact_warnings && Array.isArray(orderFactData.fact_warnings) && orderFactData.fact_warnings.length > 0) {
                    console.warn('[User Bound Page] 发现事实不一致警告:', orderFactData.fact_warnings)
                    // 使用 toast 进行非阻塞式提醒
                    orderFactData.fact_warnings.forEach((warning: string) => {
                      toast({
                        title: "事实不一致警告",
                        description: warning,
                        variant: "default", // 使用默认样式，不阻塞用户操作
                        duration: 5000, // 5秒后自动消失
                      })
                    })
                  }
                  
                  // Facts → ViewModel 转换（在 page 层完成）
                  // 确保 order 和 traces 数据有效，避免转换函数出错
                  if (orderFactData.order && typeof orderFactData.order === 'object') {
                    try {
                      const timelineViewModel = convertOrderFactsToTimelineViewModel(
                        orderFactData.order,
                        Array.isArray(orderFactData.traces) ? orderFactData.traces : []
                      )
                      setLatestOrderTimeline(timelineViewModel)
                    } catch (error) {
                      console.error('[User Bound Page] 转换订单时间线 ViewModel 失败:', error)
                    }
                  }
                  
                  // 将订单关联的资产与现有资产列表合并（去重）
                  if (orderFactData.assets && Array.isArray(orderFactData.assets) && orderFactData.assets.length > 0) {
                    // Facts → ViewModel 转换（在 page 层完成）
                    // 确保每个资产数据有效，避免转换函数出错
                    try {
                      const newAssetViewModels = orderFactData.assets
                        .filter((asset: any) => asset && typeof asset === 'object' && asset.asset_id)
                        .map(convertAssetFactToCardViewModel)
                      setAssetsList((prev) => {
                        const existingIds = new Set(prev.map((a) => a.assetId))
                        const newAssets = newAssetViewModels.filter(
                          (a) => !existingIds.has(a.assetId)
                        )
                        return [...prev, ...newAssets]
                      })
                    } catch (error) {
                      console.error('[User Bound Page] 转换订单关联资产 ViewModel 失败:', error)
                    }
                  }
                }
              } else if (orderFactResponse.status === 401 || orderFactResponse.status === 403) {
                console.error('[User Bound Page] 权限验证失败，请确保已登录')
              }
            }
          } else if (latestOrderResponse.status === 401 || latestOrderResponse.status === 403) {
            console.error('[User Bound Page] 权限验证失败，请确保已登录')
          }
        } catch (error) {
          console.error('[User Bound Page] 获取最近一次配送失败:', error)
        }

      } catch (error) {
        console.error('[User Bound Page] 加载事实数据失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFactData()
  }, [])

  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 完整IoT Dashboard - 实时数据 */}
        <IoTDashboard onDeviceClick={() => setIsDevicesDialogOpen(true)} />

        {/* 事实数据区域 */}
        <div className="space-y-6">
          {/* 最近订单（只显示状态） */}
          <Card className="theme-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30" style={{ borderRadius: 'var(--radius-button)' }}>
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">最近订单</h2>
                <p className="text-xs text-muted-foreground">只显示订单状态（事实）</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            ) : restaurantOverview ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="theme-card p-4">
                  <div className="text-xs text-muted-foreground mb-1">活跃订单</div>
                  <div className="text-2xl font-bold text-foreground">{restaurantOverview.active_orders ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1 opacity-60">accepted / delivering</div>
                </div>
                <div className="theme-card p-4">
                  <div className="text-xs text-muted-foreground mb-1">已完成订单</div>
                  <div className="text-2xl font-bold text-foreground">{restaurantOverview.completed_orders ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-1 opacity-60">completed</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <span className="text-sm">暂无订单数据</span>
              </div>
            )}
          </Card>

          {/* 最近一次配送（OrderTimeline） */}
          {latestOrderTimeline && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-linear-to-br from-success to-emerald-600 flex items-center justify-center shadow-lg shadow-success/30" style={{ borderRadius: 'var(--radius-button)' }}>
                  <Clock className="w-5 h-5 text-success-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">最近一次配送</h2>
                  <p className="text-xs text-muted-foreground">订单事实时间线</p>
                </div>
              </div>
              <OrderTimeline viewModel={latestOrderTimeline} />
            </div>
          )}

          {/* 关联资产对话框 */}
          <Dialog open={isDevicesDialogOpen} onOpenChange={setIsDevicesDialogOpen}>
            <DialogContent className="theme-card theme-glass max-w-2xl max-h-[80vh] overflow-y-auto">
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
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  {assetsList.map((assetViewModel) => (
                    <AssetFactCard 
                      key={assetViewModel.assetId} 
                      viewModel={assetViewModel}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <span className="text-sm">暂无关联资产</span>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* 如果餐厅总览显示有活跃资产，但资产列表为空，显示提示 */}
          {!isLoading && restaurantOverview && (restaurantOverview.active_assets ?? 0) > 0 && assetsList.length === 0 && (
            <Card className="theme-card p-6">
              <div className="flex items-center justify-center py-8 text-muted-foreground">
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
