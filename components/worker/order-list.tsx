"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiRequest } from "@/lib/api-client"
import {
  Package,
  MapPin,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  Truck,
} from "lucide-react"
import { ProductType, getProductTypeLabel } from "@/lib/types/order"
import { logBusinessWarning } from "@/lib/utils/logger"

// 获取配送订单状态的中文显示
function getDeliveryOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "待接单",
    accepted: "已接单",
    delivering: "配送中",
    completed: "已完成",
  }
  return labels[status] || status
}

// 获取配送订单状态的颜色样式
function getDeliveryOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    accepted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    delivering: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
  }
  return colors[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30"
}

interface Order {
  id: string
  restaurant_id: string
  product_type: ProductType | null
  service_type: string
  status: string // 使用字符串类型，支持 pending/accepted/delivering/completed
  amount: number
  assigned_to: string | null
  worker_id: string | null
  created_at: string
  updated_at?: string
  restaurants: {
    id: string
    name: string
    address: string | null
    contact_phone: string | null
  } | null
}

interface OrderListProps {
  productType?: ProductType | string | null // 产品类型筛选（支持枚举值和前端简化名称）
  workerId?: string | null // 配送员ID
  onAcceptOrder?: (orderId: string) => void // 接单回调（可选）
  onSelectOrder?: (order: Order) => void // 选择订单回调（可选，用于直接选择订单进行配送）
}

export function WorkerOrderList({ productType, workerId, onAcceptOrder, onSelectOrder }: OrderListProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null)

  // 加载订单列表
  useEffect(() => {
    loadOrders()
  }, [productType, workerId])

  const loadOrders = async () => {
    setIsLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (productType) {
        // 产品类型映射：将前端的简化名称映射到数据库的完整名称
        let dbProductType: string = productType
        if (productType === "clean") {
          dbProductType = "clean_fuel"
        } else if (productType === "alcohol") {
          dbProductType = "methanol"
        } else if (productType === "outdoor") {
          dbProductType = "outdoor_fuel"
        }
        params.append("product_type", dbProductType)
        console.log("[订单列表] 产品类型映射:", productType, "->", dbProductType)
      }
      if (workerId) {
        params.append("worker_id", workerId)
      }

      const headers: HeadersInit = {}
      
      // 如果提供了workerId，添加到请求头
      if (workerId) {
        headers["x-worker-id"] = workerId
      }

      const apiUrl = `/api/orders/pending?${params.toString()}`
      console.log("[订单列表] 开始加载订单，URL:", apiUrl, "workerId:", workerId, "productType:", productType)

      const response = await fetch(apiUrl, {
        headers,
      })
      
      console.log("[订单列表] API响应状态:", response.status, response.statusText)
      
      const result = await response.json()
      console.log("[订单列表] API返回数据:", result)

      if (!response.ok || result.error) {
        const errorMsg = result.error || result.details || "加载订单失败"
        logBusinessWarning('订单列表', 'API错误', { errorMsg, fullResponse: result })
        throw new Error(errorMsg)
      }

      const ordersData = result.data || []
      console.log("[订单列表] 获取到订单数量:", ordersData.length, "订单数据:", ordersData)
      
      if (ordersData.length === 0) {
        console.warn("[订单列表] 没有待接单订单，可能原因：1. 数据库中没有pending状态的订单 2. RLS策略限制 3. 产品类型筛选")
      }
      
      // 如果需要餐厅信息，单独查询
      const ordersWithRestaurants = await Promise.all(
        ordersData.map(async (order: any) => {
          if (order.restaurant_id && !order.restaurants) {
            try {
              console.log("[订单列表] 查询餐厅信息，restaurant_id:", order.restaurant_id)
              const restaurantResponse = await fetch(`/api/restaurant?id=${order.restaurant_id}`)
              const restaurantResult = await restaurantResponse.json()
              if (restaurantResult.success && restaurantResult.restaurant) {
                order.restaurants = {
                  id: restaurantResult.restaurant.id,
                  name: restaurantResult.restaurant.name,
                  address: restaurantResult.restaurant.address,
                  contact_phone: restaurantResult.restaurant.contact_phone,
                }
                console.log("[订单列表] 餐厅信息查询成功:", order.restaurants.name)
              } else {
                console.warn("[订单列表] 餐厅信息查询失败:", restaurantResult.error)
              }
            } catch (err) {
              logBusinessWarning('订单列表', '获取餐厅信息异常', err)
            }
          }
          return order
        })
      )
      
      console.log("[订单列表] 最终订单列表（含餐厅信息）:", ordersWithRestaurants.length, "条")
      setOrders(ordersWithRestaurants)
      // 如果加载成功，清空之前的错误信息
      if (ordersWithRestaurants.length > 0) {
        setError("")
      }
    } catch (err: any) {
      logBusinessWarning('订单列表', '加载订单失败', err)
      // 加载失败时，保留现有订单列表，只显示错误信息
      // 不清空订单列表，避免用户看到空列表
      setError(err.message || "加载订单失败")
      // 注意：不调用 setOrders([])，保持当前订单列表
    } finally {
      setIsLoading(false)
    }
  }

  // 接单
  const handleAccept = async (orderId: string) => {
    if (!workerId) {
      setError("请先设置配送员ID")
      return
    }

    setAcceptingOrderId(orderId)
    // 注意：不清空错误信息，保留之前的错误提示（如果有）
    // setError("")

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      
      // 如果提供了workerId，添加到请求头
      if (workerId) {
        headers["x-worker-id"] = workerId
      }

      console.log("[接单] 开始接单，订单ID:", orderId, "Worker ID:", workerId)

      const result = await apiRequest({
        endpoint: "/api/orders/accept",
        method: "POST",
        headers,
        body: {
          order_id: orderId, // 使用 order_id 作为参数
          worker_id: workerId || undefined,
        },
        showToast: true,
        successMessage: "接单成功",
        errorMessage: "接单失败",
        operationType: "order",
        enableOfflineStorage: true,
      })

      if (!result.success) {
        // 提供更详细的错误信息
        const errorMsg = result.error || "接单失败"
        const errorDetails = (result as any).details || ""
        const fullErrorMsg = errorDetails ? `${errorMsg}：${errorDetails}` : errorMsg
        logBusinessWarning('接单', '接单失败详情', {
          error: result.error,
          details: (result as any).details,
          currentOrder: (result as any).currentOrder
        })
        throw new Error(fullErrorMsg)
      }

      console.log("[接单] 接单成功，刷新订单列表")
      // 接单成功后，刷新订单列表（订单状态已改变，应该从列表中移除）
      await loadOrders()
      // 调用回调
      onAcceptOrder?.(orderId)
    } catch (err: any) {
      logBusinessWarning('接单', '接单失败', err)
      // 接单失败时，不清空订单列表，只显示错误信息
      setError(err.message || "接单失败")
      // 注意：不调用 loadOrders()，保持当前订单列表不变
      // 这样用户可以看到订单，并可以重试或查看错误原因
    } finally {
      setAcceptingOrderId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
        <span className="text-slate-400">加载订单中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card semanticLevel="system_hint" className="bg-red-500/10 border-red-500/30 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </Card>
    )
  }

  if (orders.length === 0 && !isLoading) {
    return (
      <Card semanticLevel="system_hint" className="bg-slate-900/50 border-slate-800/50 p-8">
        <div className="text-center space-y-3">
          <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">暂无待接单订单</p>
          <div className="text-xs text-slate-500 space-y-1 mt-4">
            <p>可能原因：</p>
            <p>1. 数据库中没有 status='pending' 的订单</p>
            <p>2. RLS策略限制了数据访问</p>
            {productType && <p>3. 产品类型筛选：{productType}</p>}
            {workerId && <p>4. Worker ID: {workerId}</p>}
          </div>
          <Button
            onClick={() => loadOrders()}
            variant="outline"
            size="sm"
            className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800/50"
          >
            刷新列表
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const status = (order.status || "").toLowerCase()
        const isPending = status === "pending"
        const isAccepted = status === "accepted"
        const isDelivering = status === "delivering"
        const isCompleted = status === "completed"
        const canAccept = isPending && !order.assigned_to && !order.worker_id
        const canDispatch = isAccepted && order.worker_id === workerId
        const canComplete = isDelivering && order.worker_id === workerId

        return (
          <Card
            key={order.id}
            semanticLevel="secondary_fact"
            className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">订单号: {order.id}</span>
                  <Badge className={`${getDeliveryOrderStatusColor(status)} text-xs`}>
                    {getDeliveryOrderStatusLabel(status)}
                  </Badge>
                </div>

                {order.product_type && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                      {getProductTypeLabel(order.product_type)}
                    </Badge>
                  </div>
                )}

                {order.restaurants && (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      <span className="text-white">{order.restaurants.name}</span>
                    </div>
                    {order.restaurants.address && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        <span>{order.restaurants.address}</span>
                      </div>
                    )}
                    {order.restaurants.contact_phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Phone className="h-3 w-3" />
                        <span>{order.restaurants.contact_phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3 text-slate-400" />
                <span className="text-slate-400">
                  {new Date(order.created_at).toLocaleString("zh-CN")}
                </span>
                <span className="text-white font-medium ml-2">¥{order.amount.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                {canAccept && (
                  <Button
                    onClick={() => {
                      if (onSelectOrder) {
                        // 如果提供了选择订单回调，直接选择订单（不接单）
                        onSelectOrder(order)
                      } else {
                        // 执行接单流程
                        handleAccept(order.id)
                      }
                    }}
                    disabled={acceptingOrderId === order.id}
                    size="sm"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white"
                  >
                    {acceptingOrderId === order.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        接单中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {onSelectOrder ? "选择订单" : "接单"}
                      </>
                    )}
                  </Button>
                )}

                {canDispatch && (
                  <Button
                    onClick={async () => {
                      if (!workerId) {
                        setError("请先设置配送员ID")
                        return
                      }
                      try {
                        const result = await apiRequest({
                          endpoint: "/api/orders/dispatch",
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "x-worker-id": workerId,
                          },
                          body: {
                            id: order.id,
                            order_id: order.id,
                            worker_id: workerId,
                          },
                          showToast: true,
                          successMessage: "开始配送",
                          errorMessage: "派单失败",
                        })
                        if (result.success) {
                          await loadOrders()
                        }
                      } catch (err: any) {
                        setError(err.message || "派单失败")
                      }
                    }}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    开始配送
                  </Button>
                )}

                {canComplete && (
                  <Button
                    onClick={() => {
                      if (onSelectOrder) {
                        onSelectOrder(order)
                      }
                    }}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    完成配送
                  </Button>
                )}

                {isDelivering && !canComplete && (
                  <Button
                    onClick={() => {
                      if (onSelectOrder) {
                        onSelectOrder(order)
                      }
                    }}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    查看详情
                  </Button>
                )}

                {isCompleted && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    已完成
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

