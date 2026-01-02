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
} from "lucide-react"
import { OrderStatus, ProductType, getOrderStatusLabel, getProductTypeLabel } from "@/lib/types/order"

interface Order {
  id: string
  restaurant_id: string
  product_type: ProductType | null
  service_type: string
  status: OrderStatus
  amount: number
  assigned_to: string | null
  created_at: string
  restaurants: {
    id: string
    name: string
    address: string | null
    contact_phone: string | null
  } | null
}

interface OrderListProps {
  productType?: ProductType | null // 产品类型筛选
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
        params.append("product_type", productType)
      }
      if (workerId) {
        params.append("worker_id", workerId)
      }

      const headers: HeadersInit = {}
      
      // 如果提供了workerId，添加到请求头
      if (workerId) {
        headers["x-worker-id"] = workerId
      }

      const response = await fetch(`/api/orders/pending?${params.toString()}`, {
        headers,
      })
      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || "加载订单失败")
      }

      setOrders(result.data || [])
    } catch (err: any) {
      console.error("加载订单失败:", err)
      setError(err.message || "加载订单失败")
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
    setError("")

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      
      // 如果提供了workerId，添加到请求头
      if (workerId) {
        headers["x-worker-id"] = workerId
      }

      const result = await apiRequest({
        endpoint: "/api/orders/dispatch",
        method: "POST",
        headers,
        body: {
          order_id: orderId,
          worker_id: workerId || undefined,
        },
        showToast: true,
        successMessage: "接单成功",
        errorMessage: "接单失败",
        operationType: "order",
        enableOfflineStorage: true,
      })

      if (!result.success) {
        throw new Error(result.error || "接单失败")
      }

      // 刷新订单列表
      await loadOrders()
      // 调用回调
      onAcceptOrder(orderId)
    } catch (err: any) {
      console.error("接单失败:", err)
      setError(err.message || "接单失败")
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
      <Card className="bg-red-500/10 border-red-500/30 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-slate-800/50 p-8">
        <div className="text-center">
          <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">暂无待接单订单</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isProcessing = order.status === OrderStatus.PROCESSING
        const isDelivering = order.status === OrderStatus.DELIVERING
        const canAccept = isProcessing && !order.assigned_to

        return (
          <Card
            key={order.id}
            className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">订单号: {order.id}</span>
                  <Badge
                    className={
                      isProcessing
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs"
                    }
                  >
                    {getOrderStatusLabel(order.status)}
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

              {canAccept && (
                <Button
                  onClick={() => {
                    if (onSelectOrder) {
                      // 如果提供了选择订单回调，直接选择订单（不接单）
                      onSelectOrder(order)
                    } else if (onAcceptOrder) {
                      // 否则执行接单流程
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

              {isDelivering && (
                <Button
                  onClick={() => {
                    if (onSelectOrder) {
                      onSelectOrder(order)
                    }
                  }}
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white"
                >
                  继续配送
                </Button>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

