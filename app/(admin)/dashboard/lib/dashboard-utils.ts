// Dashboard 工具函数
// 从 page.tsx 提取，用于模块化重构

import { Order, Restaurant } from "../types/dashboard-types"

/**
 * 格式化时间显示
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString("zh-CN")
}

/**
 * 获取订单状态样式
 */
export const getOrderStatusStyle = (status: string): string => {
  const normalizedStatus = status.toLowerCase()
  if (normalizedStatus === "pending" || status === "待处理") {
    return "border-blue-500/50 bg-blue-500/10"
  }
  if (normalizedStatus === "delivering" || status === "配送中" || normalizedStatus === "processing" || status === "进行中") {
    return "border-yellow-500/50 bg-yellow-500/10"
  }
  if (normalizedStatus === "completed" || status === "已完成") {
    return "border-green-500/50 bg-green-500/10"
  }
  return "border-slate-700/50 bg-slate-800/50"
}

/**
 * 获取订单状态标签
 */
export const getOrderStatusLabel = (status: string): string => {
  const normalizedStatus = status.toLowerCase()
  if (normalizedStatus === "pending" || status === "待处理") {
    return "待处理"
  }
  if (normalizedStatus === "delivering" || status === "配送中") {
    return "配送中"
  }
  if (normalizedStatus === "processing" || status === "进行中") {
    return "进行中"
  }
  if (normalizedStatus === "completed" || status === "已完成") {
    return "已完成"
  }
  return status
}

/**
 * 判断是否为维修订单
 */
export const isRepairOrder = (serviceType: string): boolean => {
  const normalizedType = serviceType.toLowerCase()
  return (
    serviceType === "维修服务" ||
    serviceType.includes("维修") ||
    normalizedType.includes("repair")
  )
}

/**
 * 判断是否为配送订单
 */
export const isDeliveryOrder = (serviceType: string): boolean => {
  return (
    serviceType?.includes("配送") ||
    serviceType === "燃料配送"
  )
}

/**
 * 计算统计数据
 */
export const calculateDashboardStats = (restaurants: Restaurant[], orders: Order[]) => {
  return {
    totalRestaurants: restaurants.length,
    activatedRestaurants: restaurants.filter((r) =>
      r.status === "activated" || r.status === "已激活"
    ).length,
    pendingOrders: orders.filter((o) =>
      o.status === "pending" || o.status === "待处理"
    ).length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.amount || 0), 0),
  }
}
