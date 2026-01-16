"use client"

import { useState, useEffect } from "react"
import { Package, Truck, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { logBusinessWarning } from "@/lib/utils/logger"

interface Order {
  id: string
  restaurant_id: string
  service_type: string
  status: string
  amount: number
  created_at: string
  updated_at: string
  order_type: "delivery" | "repair"
  product_type?: string
  description?: string
  worker_id?: string
}

// 状态映射：数据库状态 -> 显示状态
const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "待处理", color: "bg-warning text-warning-foreground", icon: Clock },
  accepted: { label: "已接单", color: "bg-primary text-primary-foreground", icon: Truck },
  delivering: { label: "配送中", color: "bg-primary text-primary-foreground", icon: Truck },
  processing: { label: "处理中", color: "bg-primary text-primary-foreground", icon: Package },
  completed: { label: "已完成", color: "bg-success text-success-foreground", icon: CheckCircle2 },
  cancelled: { label: "已取消", color: "bg-destructive text-destructive-foreground", icon: XCircle },
}

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  // 加载餐厅ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      const rid = localStorage.getItem("restaurantId")
      setRestaurantId(rid)
    }
  }, [])

  // 加载订单数据
  useEffect(() => {
    if (!restaurantId) {
      setIsLoading(false)
      return
    }

    loadOrders()
  }, [restaurantId, activeTab])

  const loadOrders = async () => {
    if (!restaurantId) return

    setIsLoading(true)
    setError(null)

    try {
      const status = activeTab === "all" ? null : activeTab === "ongoing" ? null : activeTab
      const params = new URLSearchParams({ restaurant_id: restaurantId })
      if (status) {
        params.append("status", status)
      }

      const response = await fetch(`/api/orders/list?${params.toString()}`)
      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || "加载订单失败")
      }

      let ordersData = result.data || []

      // 如果是"进行中"标签，筛选出 accepted, delivering, processing 状态的订单
      if (activeTab === "ongoing") {
        ordersData = ordersData.filter((order: Order) =>
          ["accepted", "delivering", "processing"].includes(order.status)
        )
      }

      setOrders(ordersData)
    } catch (err: any) {
      logBusinessWarning('订单列表', '加载订单失败', err)
      setError(err.message || "加载订单失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 格式化订单显示
  const formatOrder = (order: Order) => {
    const statusInfo = statusMap[order.status] || {
      label: order.status,
      color: "bg-muted text-muted-foreground",
      icon: Package,
    }

    // 格式化金额
    const amount = order.amount ? `¥${order.amount.toFixed(2)}` : "¥0"

    // 格式化时间
    const time = new Date(order.created_at).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

    // 订单详情
    const details = order.description || order.service_type || "订单详情"

    return {
      id: order.id,
      service: order.service_type,
      status: statusInfo.label,
      statusColor: statusInfo.color,
      icon: statusInfo.icon,
      time,
      amount,
      details,
    }
  }

  // 如果没有餐厅ID，显示提示
  if (!restaurantId) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-foreground">我的订单</h1>
        <Card className="glass-breath p-6 text-center">
          <p className="text-muted-foreground">请先登录并绑定餐厅</p>
        </Card>
      </div>
    )
  }

  // 加载中状态
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-foreground">我的订单</h1>
        <Card className="glass-breath p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </Card>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-foreground">我的订单</h1>
        <Card className="glass-breath p-6 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadOrders}>重试</Button>
        </Card>
      </div>
    )
  }

  // 根据当前标签筛选订单
  const getFilteredOrders = () => {
    let filtered = orders

    // 根据标签筛选
    if (activeTab === "pending") {
      filtered = filtered.filter((order) => order.status === "pending")
    } else if (activeTab === "ongoing") {
      filtered = filtered.filter((order) =>
        ["accepted", "delivering", "processing"].includes(order.status)
      )
    } else if (activeTab === "completed") {
      filtered = filtered.filter((order) => order.status === "completed")
    } else if (activeTab === "cancelled") {
      filtered = filtered.filter((order) => order.status === "cancelled")
    }

    return filtered.map(formatOrder)
  }

  const filteredOrders = getFilteredOrders()

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 text-foreground">我的订单</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6 glass-breath bg-muted/50">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">全部</TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">待处理</TabsTrigger>
          <TabsTrigger value="ongoing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">进行中</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">已完成</TabsTrigger>
          <TabsTrigger value="cancelled" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground">已取消</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <Card key={order.id} semanticLevel="secondary_fact" className="glass-breath p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
                    <order.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{order.service}</h3>
                      <Badge className={`text-xs ${order.statusColor}`}>{order.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{order.details}</p>
                    <p className="text-xs text-muted-foreground mb-1">订单号: {order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.time}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg mb-2 text-foreground">{order.amount}</div>
                    <Button size="sm" variant="outline">
                      查看详情
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">暂无订单</div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <Card key={order.id} semanticLevel="secondary_fact" className="glass-breath p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
                    <order.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{order.service}</h3>
                      <Badge className={`text-xs ${order.statusColor}`}>{order.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{order.details}</p>
                    <p className="text-xs text-muted-foreground mb-1">订单号: {order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.time}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg mb-2 text-foreground">{order.amount}</div>
                    <Button size="sm" variant="outline">
                      查看详情
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">暂无待处理订单</div>
          )}
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <Card key={order.id} semanticLevel="secondary_fact" className="glass-breath p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
                    <order.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{order.service}</h3>
                      <Badge className={`text-xs ${order.statusColor}`}>{order.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{order.details}</p>
                    <p className="text-xs text-muted-foreground mb-1">订单号: {order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.time}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg mb-2 text-foreground">{order.amount}</div>
                    <Button size="sm" variant="outline">
                      查看详情
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">暂无进行中订单</div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <Card key={order.id} semanticLevel="secondary_fact" className="glass-breath p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
                    <order.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{order.service}</h3>
                      <Badge className={`text-xs ${order.statusColor}`}>{order.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{order.details}</p>
                    <p className="text-xs text-muted-foreground mb-1">订单号: {order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.time}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg mb-2 text-foreground">{order.amount}</div>
                    <Button size="sm" variant="outline">
                      查看详情
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">暂无已完成订单</div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <Card key={order.id} semanticLevel="secondary_fact" className="glass-breath p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
                    <order.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{order.service}</h3>
                      <Badge className={`text-xs ${order.statusColor}`}>{order.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{order.details}</p>
                    <p className="text-xs text-muted-foreground mb-1">订单号: {order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.time}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg mb-2 text-foreground">{order.amount}</div>
                    <Button size="sm" variant="outline">
                      查看详情
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">暂无已取消订单</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
