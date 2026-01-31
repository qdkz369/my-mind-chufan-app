"use client"

// 订单管理组件
// 从 page.tsx 的 renderOrders() 函数提取

import { Package, Building2, Clock, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Order } from "../types/dashboard-types"
import { formatTime, getOrderStatusStyle } from "../lib/dashboard-utils"

function getServiceTypeBadge(serviceType: string) {
  const normalizedType = (serviceType || "").toLowerCase()
  if (serviceType === "维修服务" || serviceType?.includes("维修") || normalizedType.includes("repair")) {
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">维修服务</Badge>
  }
  // 液化气相关（采购订单或仅“液化气”）统一显示「液化气采购」标签，与燃料配送区分
  if (serviceType?.includes("液化气采购") || serviceType === "液化气采购订单" || serviceType?.includes("液化气")) {
    return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">液化气采购</Badge>
  }
  if (serviceType?.includes("配送") || serviceType === "燃料配送") {
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">燃料配送</Badge>
  }
  if (serviceType?.includes("租赁") || serviceType?.includes("设备")) {
    return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">{serviceType}</Badge>
  }
  return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">{serviceType || "其他"}</Badge>
}

interface OrdersManagementProps {
  orders: Order[]
  isLoadingOrders: boolean
  orderServiceTypeFilter: string
  onOrderServiceTypeFilterChange: (value: string) => void
  orderStatusFilter: string
  onOrderStatusFilterChange: (value: string) => void
  onOrderClick: (order: Order) => void
}

export function OrdersManagement({
  orders,
  isLoadingOrders,
  orderServiceTypeFilter,
  onOrderServiceTypeFilterChange,
  orderStatusFilter,
  onOrderStatusFilterChange,
  onOrderClick,
}: OrdersManagementProps) {
  // 按服务类型分类
  const repairOrders = orders.filter((o) => {
    const serviceType = o.service_type || ""
    const normalizedType = serviceType.toLowerCase()
    return serviceType === "维修服务" || serviceType.includes("维修") || normalizedType.includes("repair")
  })
  // 燃料相关：燃料配送 + 液化气采购/液化气（与燃料配送数据互通，归入同一类筛选）
  const deliveryOrders = orders.filter((o) => {
    const t = o.service_type || ""
    return t.includes("配送") || t === "燃料配送" || t.includes("液化气采购") || t === "液化气采购订单" || t.includes("液化气")
  })
  const otherOrders = orders.filter((o) => {
    const serviceType = o.service_type || ""
    const normalizedType = serviceType.toLowerCase()
    const isRepair = serviceType === "维修服务" || serviceType.includes("维修") || normalizedType.includes("repair")
    const isFuelRelated = serviceType.includes("配送") || serviceType === "燃料配送" || serviceType.includes("液化气采购") || serviceType === "液化气采购订单" || serviceType.includes("液化气")
    return !isRepair && !isFuelRelated
  })

  // 按状态分类
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "待处理")
  const deliveringOrders = orders.filter((o) => o.status === "delivering" || o.status === "配送中" || o.status === "进行中" || o.status === "processing")
  const completedOrders = orders.filter((o) => o.status === "completed" || o.status === "已完成")

  // 根据筛选条件显示订单
  const displayOrders =
    orderServiceTypeFilter === "all"
      ? orders
      : orderServiceTypeFilter === "维修服务"
        ? repairOrders
        : orderServiceTypeFilter === "燃料配送"
          ? deliveryOrders
          : otherOrders

  const listTitle =
    orderServiceTypeFilter === "all"
      ? "所有订单"
      : orderServiceTypeFilter === "维修服务"
        ? "维修服务订单"
        : orderServiceTypeFilter === "燃料配送"
          ? "燃料配送订单"
          : "其他订单"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">订单管理</h1>
        <p className="text-slate-400">按业务类型管理所有订单</p>
      </div>

      {/* 订单统计：点击卡片切换为对应筛选并指向下方列表 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          semanticLevel="primary_fact"
          className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => {
            onOrderServiceTypeFilterChange("all")
            onOrderStatusFilterChange("all")
          }}
        >
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">总订单数</CardDescription>
            <CardTitle className="text-2xl md:text-3xl text-white">{orders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card
          semanticLevel="primary_fact"
          className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => onOrderStatusFilterChange("pending")}
        >
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">待处理</CardDescription>
            <CardTitle className="text-3xl text-yellow-400">{pendingOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card
          semanticLevel="primary_fact"
          className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => onOrderStatusFilterChange("delivering")}
        >
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">进行中</CardDescription>
            <CardTitle className="text-2xl md:text-3xl text-blue-400">{deliveringOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card
          semanticLevel="primary_fact"
          className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => onOrderStatusFilterChange("completed")}
        >
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">已完成</CardDescription>
            <CardTitle className="text-3xl text-green-400">{completedOrders.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 业务类型统计：点击卡片切换为对应服务类型筛选并指向下方列表 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          semanticLevel="secondary_fact"
          className="bg-gradient-to-br from-red-900/30 to-red-950/50 border-red-800/50 backdrop-blur-sm cursor-pointer hover:border-red-500/50 transition-colors"
          onClick={() => onOrderServiceTypeFilterChange("维修服务")}
        >
          <CardHeader className="pb-3">
            <CardDescription className="text-red-300">维修服务订单</CardDescription>
            <CardTitle className="text-xl md:text-2xl text-red-400">{repairOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card
          semanticLevel="secondary_fact"
          className="bg-gradient-to-br from-blue-900/30 to-blue-950/50 border-blue-800/50 backdrop-blur-sm cursor-pointer hover:border-blue-500/50 transition-colors"
          onClick={() => onOrderServiceTypeFilterChange("燃料配送")}
        >
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-300">燃料配送订单</CardDescription>
            <CardTitle className="text-xl md:text-2xl text-blue-400">{deliveryOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card
          semanticLevel="secondary_fact"
          className="bg-gradient-to-br from-purple-900/30 to-purple-950/50 border-purple-800/50 backdrop-blur-sm cursor-pointer hover:border-purple-500/50 transition-colors"
          onClick={() => onOrderServiceTypeFilterChange("其他")}
        >
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-300">其他订单</CardDescription>
            <CardTitle className="text-xl md:text-2xl text-purple-400">{otherOrders.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 筛选器 */}
      <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">服务类型:</label>
              <Select value={orderServiceTypeFilter} onValueChange={onOrderServiceTypeFilterChange}>
                <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="选择服务类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部订单</SelectItem>
                  <SelectItem value="维修服务">维修服务</SelectItem>
                  <SelectItem value="燃料配送">燃料配送</SelectItem>
                  <SelectItem value="其他">其他订单</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">订单状态:</label>
              <Select value={orderStatusFilter} onValueChange={onOrderStatusFilterChange}>
                <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="delivering">进行中</SelectItem>
                  <SelectItem value="processing">处理中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">{listTitle}</CardTitle>
          <CardDescription className="text-slate-400">共 {displayOrders.length} 条订单</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <div className="text-center py-8">
              <div className="inline-block h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 mt-2 text-sm">加载中...</p>
            </div>
          ) : displayOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">暂无订单</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayOrders.map((order) => {
                const isPending = order.status === "pending" || order.status === "待处理"
                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:border-blue-500/50 ${
                      isPending ? getOrderStatusStyle(order.status) + " animate-pulse-subtle" : "border-slate-700/50 bg-slate-800/50"
                    }`}
                    onClick={() => onOrderClick(order)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-blue-400" />
                          <span className="font-semibold text-white">{order.restaurant_name}</span>
                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                            {order.id.slice(0, 8)}
                          </Badge>
                          {getServiceTypeBadge(order.service_type || "")}
                        </div>
                      </div>
                      <Badge
                        className={
                          isPending
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : order.status === "delivering" || order.status === "配送中" || order.status === "processing" || order.status === "进行中"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : "bg-green-500/20 text-green-400 border-green-500/30"
                        }
                      >
                        {isPending
                          ? "待处理"
                          : order.status === "delivering" || order.status === "配送中" || order.status === "processing" || order.status === "进行中"
                            ? "进行中"
                            : "已完成"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(order.created_at)}
                        </div>
                        {order.worker_id && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            已指派工人
                          </div>
                        )}
                      </div>
                      <div className="text-lg font-semibold text-white">¥{order.amount.toFixed(2)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
