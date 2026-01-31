"use client"

// Dashboard 工作台概览组件
// 从 page.tsx 的 renderDashboard() 函数提取

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Clock,
  ShoppingCart,
  ChevronRight,
  X,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Order, Restaurant } from "../types/dashboard-types"
import { formatTime, getOrderStatusStyle, calculateDashboardStats } from "../lib/dashboard-utils"

interface DashboardOverviewProps {
  restaurants: Restaurant[]
  orders: Order[]
  recentOrders: Order[]
  recentOrdersCount: number
  isLoadingOrders: boolean
  isRecentOrdersExpanded: boolean
  onExpandOrders: () => void
  onCollapseOrders: () => void
  onLoadRecentOrders: () => Promise<void>
  onNavigateToRepairs: (orderId: string) => void
}

export function DashboardOverview({
  restaurants,
  orders,
  recentOrders,
  recentOrdersCount,
  isLoadingOrders,
  isRecentOrdersExpanded,
  onExpandOrders,
  onCollapseOrders,
  onLoadRecentOrders,
  onNavigateToRepairs,
}: DashboardOverviewProps) {
  const router = useRouter()
  const stats = calculateDashboardStats(restaurants, orders)

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">总餐厅数</CardDescription>
            <CardTitle className="text-2xl md:text-3xl text-white">{stats.totalRestaurants}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">已激活</CardDescription>
            <CardTitle className="text-2xl md:text-3xl text-white">{stats.activatedRestaurants}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="primary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">待处理订单</CardDescription>
            <CardTitle className="text-2xl md:text-3xl text-yellow-400">{stats.pendingOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card semanticLevel="financial" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400">总营收</CardDescription>
            <CardTitle className="text-2xl md:text-3xl text-green-400">¥{stats.totalRevenue.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 最新订单 - 折叠消息条目提醒 */}
      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">最新订单</CardTitle>
          <CardDescription className="text-slate-400">实时订单动态</CardDescription>
        </CardHeader>
        <CardContent>
          {!isRecentOrdersExpanded ? (
            // 折叠状态：显示消息条目提醒
            <div 
              className="p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/5 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/10 transition-all duration-300"
              onClick={async () => {
                onExpandOrders()
                await onLoadRecentOrders()
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <ShoppingCart className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">点击查看最新订单</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {recentOrdersCount > 0 ? `共有 ${recentOrdersCount} 个订单` : '正在获取订单数量...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {recentOrdersCount > 0 ? `${recentOrdersCount} 条` : '加载中'}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-blue-400" />
                </div>
              </div>
            </div>
          ) : (
            // 展开状态：显示实际订单列表
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-400">已展开订单列表</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCollapseOrders}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4 mr-1" />
                  折叠
                </Button>
              </div>
              {isLoadingOrders ? (
                <div className="text-center py-8">
                  <div className="inline-block h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 mt-2 text-sm">加载中...</p>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">暂无订单</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.slice(0, 5).map((order) => {
                    const isPending = order.status === "pending" || order.status === "待处理"
                    return (
                      <div
                        key={order.id}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:border-blue-500/50 ${
                          isPending 
                            ? getOrderStatusStyle(order.status) + " animate-pulse-subtle"
                            : "border-slate-700/50 bg-slate-800/50"
                        }`}
                        onClick={async () => {
                          // 根据订单类型跳转到相应的管理页面
                          const serviceType = order.service_type || ""
                          const normalizedType = serviceType.toLowerCase()
                          const isRepairOrder = 
                            serviceType === "维修服务" ||
                            serviceType.includes("维修") ||
                            normalizedType.includes("repair")
                          
                          if (isRepairOrder) {
                            onNavigateToRepairs(order.id)
                          } else {
                            // 其他类型的订单，可以跳转到订单管理或显示提示
                            alert(`订单类型: ${order.service_type}\n订单ID: ${order.id}\n状态: ${order.status}`)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-4 w-4 text-blue-400" />
                              <span className="font-semibold text-white text-sm">
                                {order.restaurant_name}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 ml-6">
                              {order.service_type}
                            </div>
                          </div>
                          <Badge
                            className={
                              isPending
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : order.status === "delivering" || order.status === "配送中"
                                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                  : "bg-green-500/20 text-green-400 border-green-500/30"
                            }
                          >
                            {isPending ? "待处理" : order.status === "delivering" || order.status === "配送中" ? "配送中" : "已完成"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            {formatTime(order.created_at)}
                          </div>
                          {order.amount > 0 && (
                            <div className="text-sm font-semibold text-white">
                              ¥{order.amount.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
