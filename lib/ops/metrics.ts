/**
 * 运营指标计算模块
 * 阶段 2B-6：运营可观测性 · 系统自省 · 决策接口层
 * 
 * 核心原则：
 * - 只读操作，不写数据库
 * - 基于现有表（delivery_orders / audit_logs）
 * - 允许返回 null（现实世界允许无数据）
 * - 不允许引入新状态
 * - 集中管理所有"运营指标计算逻辑"，不散落在 API 中
 */

import { supabase } from "@/lib/supabase"

/**
 * 订单整体概况指标
 */
export interface OrderOverviewMetrics {
  total_orders: number
  pending_orders: number
  active_orders: number        // accepted + delivering
  completed_orders: number
  exception_orders: number
  cancelled_orders: number
  rejected_orders: number
}

/**
 * 获取订单整体概况指标
 * 
 * @returns 订单整体概况指标
 */
export async function getOrderOverviewMetrics(): Promise<OrderOverviewMetrics> {
  try {
    if (!supabase) {
      throw new Error("数据库连接失败")
    }

    // 查询所有订单的状态分布（使用 COUNT）
    const { data, error } = await supabase
      .from("delivery_orders")
      .select("status")

    if (error) {
      console.error("[运营指标] 查询订单状态失败:", error)
      // 返回空指标（现实世界允许无数据）
      return {
        total_orders: 0,
        pending_orders: 0,
        active_orders: 0,
        completed_orders: 0,
        exception_orders: 0,
        cancelled_orders: 0,
        rejected_orders: 0,
      }
    }

    // 统计各状态订单数量
    const orders = data || []
    const statusCounts: Record<string, number> = {}

    orders.forEach((order: any) => {
      const status = (order.status || "").toLowerCase()
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    return {
      total_orders: orders.length,
      pending_orders: statusCounts["pending"] || 0,
      active_orders: (statusCounts["accepted"] || 0) + (statusCounts["delivering"] || 0),
      completed_orders: statusCounts["completed"] || 0,
      exception_orders: statusCounts["exception"] || 0,
      cancelled_orders: statusCounts["cancelled"] || 0,
      rejected_orders: statusCounts["rejected"] || 0,
    }
  } catch (error) {
    console.error("[运营指标] 计算订单整体概况失败:", error)
    // 返回空指标（现实世界允许无数据）
    return {
      total_orders: 0,
      pending_orders: 0,
      active_orders: 0,
      completed_orders: 0,
      exception_orders: 0,
      cancelled_orders: 0,
      rejected_orders: 0,
    }
  }
}

/**
 * 订单效率指标
 */
export interface OrderEfficiencyMetrics {
  avg_accept_time_minutes: number | null
  avg_delivery_time_minutes: number | null
  exception_rate: number        // exception / total
  completion_rate: number       // completed / total
}

/**
 * 获取订单效率指标
 * 
 * @param days 统计天数（默认 7 天）
 * @returns 订单效率指标
 */
export async function getOrderEfficiencyMetrics(days: number = 7): Promise<OrderEfficiencyMetrics> {
  try {
    if (!supabase) {
      throw new Error("数据库连接失败")
    }

    // 计算起始时间
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateISO = startDate.toISOString()

    // 1. 查询指定时间范围内的所有订单
    const { data: orders, error: ordersError } = await supabase
      .from("delivery_orders")
      .select("id, status, created_at, updated_at")
      .gte("created_at", startDateISO)

    if (ordersError) {
      console.error("[运营指标] 查询订单失败:", ordersError)
      return {
        avg_accept_time_minutes: null,
        avg_delivery_time_minutes: null,
        exception_rate: 0,
        completion_rate: 0,
      }
    }

    const ordersList = orders || []
    const totalOrders = ordersList.length

    if (totalOrders === 0) {
      return {
        avg_accept_time_minutes: null,
        avg_delivery_time_minutes: null,
        exception_rate: 0,
        completion_rate: 0,
      }
    }

    // 2. 从 audit_logs 中获取状态变更时间
    // 计算平均接单时间（从 created 到 ORDER_ACCEPTED）
    const orderIds = ordersList.map((o: any) => o.id)
    
    const { data: auditLogs, error: auditError } = await supabase
      .from("audit_logs")
      .select("target_id, action, created_at")
      .in("target_id", orderIds)
      .in("action", ["ORDER_ACCEPTED", "ORDER_COMPLETED"])

    if (auditError) {
      console.error("[运营指标] 查询审计日志失败:", auditError)
      // 即使查询失败，也继续计算其他指标
    }

    const logs = auditLogs || []

    // 按订单ID分组审计日志
    const orderLogsMap: Record<string, { accepted?: string, completed?: string }> = {}
    logs.forEach((log: any) => {
      const orderId = log.target_id
      if (!orderLogsMap[orderId]) {
        orderLogsMap[orderId] = {}
      }
      if (log.action === "ORDER_ACCEPTED") {
        orderLogsMap[orderId].accepted = log.created_at
      } else if (log.action === "ORDER_COMPLETED") {
        orderLogsMap[orderId].completed = log.created_at
      }
    })

    // 计算平均接单时间
    let totalAcceptTime = 0
    let acceptCount = 0

    ordersList.forEach((order: any) => {
      const orderId = order.id
      const orderLogs = orderLogsMap[orderId]
      if (orderLogs?.accepted) {
        const createdTime = new Date(order.created_at).getTime()
        const acceptedTime = new Date(orderLogs.accepted).getTime()
        const acceptTimeMinutes = (acceptedTime - createdTime) / (1000 * 60)
        totalAcceptTime += acceptTimeMinutes
        acceptCount++
      }
    })

    // 计算平均配送时间（从 ORDER_ACCEPTED 到 ORDER_COMPLETED）
    let totalDeliveryTime = 0
    let deliveryCount = 0

    ordersList.forEach((order: any) => {
      const orderId = order.id
      const orderLogs = orderLogsMap[orderId]
      if (orderLogs?.accepted && orderLogs?.completed) {
        const acceptedTime = new Date(orderLogs.accepted).getTime()
        const completedTime = new Date(orderLogs.completed).getTime()
        const deliveryTimeMinutes = (completedTime - acceptedTime) / (1000 * 60)
        totalDeliveryTime += deliveryTimeMinutes
        deliveryCount++
      }
    })

    // 计算异常率和完成率
    const exceptionCount = ordersList.filter((o: any) => 
      (o.status || "").toLowerCase() === "exception"
    ).length

    const completedCount = ordersList.filter((o: any) => 
      (o.status || "").toLowerCase() === "completed"
    ).length

    return {
      avg_accept_time_minutes: acceptCount > 0 ? totalAcceptTime / acceptCount : null,
      avg_delivery_time_minutes: deliveryCount > 0 ? totalDeliveryTime / deliveryCount : null,
      exception_rate: totalOrders > 0 ? exceptionCount / totalOrders : 0,
      completion_rate: totalOrders > 0 ? completedCount / totalOrders : 0,
    }
  } catch (error) {
    console.error("[运营指标] 计算订单效率指标失败:", error)
    return {
      avg_accept_time_minutes: null,
      avg_delivery_time_minutes: null,
      exception_rate: 0,
      completion_rate: 0,
    }
  }
}

/**
 * 配送员行为指标
 */
export interface WorkerBehaviorMetrics {
  total_workers_active: number
  avg_orders_per_worker: number
  reject_rate: number
  exception_rate: number
}

/**
 * 获取配送员行为指标
 * 
 * @param days 统计天数（默认 7 天）
 * @returns 配送员行为指标
 */
export async function getWorkerBehaviorMetrics(days: number = 7): Promise<WorkerBehaviorMetrics> {
  try {
    if (!supabase) {
      throw new Error("数据库连接失败")
    }

    // 计算起始时间
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateISO = startDate.toISOString()

    // 1. 查询指定时间范围内的订单（包含 worker_id）
    const { data: orders, error: ordersError } = await supabase
      .from("delivery_orders")
      .select("id, worker_id, status")
      .gte("created_at", startDateISO)
      .not("worker_id", "is", null) // 只统计有 worker_id 的订单

    if (ordersError) {
      console.error("[运营指标] 查询订单失败:", ordersError)
      return {
        total_workers_active: 0,
        avg_orders_per_worker: 0,
        reject_rate: 0,
        exception_rate: 0,
      }
    }

    const ordersList = orders || []

    if (ordersList.length === 0) {
      return {
        total_workers_active: 0,
        avg_orders_per_worker: 0,
        reject_rate: 0,
        exception_rate: 0,
      }
    }

    // 2. 统计活跃配送员数量和每个配送员的订单数
    const workerOrderCounts: Record<string, number> = {}
    const workerRejectCounts: Record<string, number> = {}
    const workerExceptionCounts: Record<string, number> = {}

    ordersList.forEach((order: any) => {
      const workerId = order.worker_id
      if (!workerId) return

      // 统计订单数
      workerOrderCounts[workerId] = (workerOrderCounts[workerId] || 0) + 1

      // 统计拒单数（rejected）
      if ((order.status || "").toLowerCase() === "rejected") {
        workerRejectCounts[workerId] = (workerRejectCounts[workerId] || 0) + 1
      }

      // 统计异常数（exception）
      if ((order.status || "").toLowerCase() === "exception") {
        workerExceptionCounts[workerId] = (workerExceptionCounts[workerId] || 0) + 1
      }
    })

    const totalWorkersActive = Object.keys(workerOrderCounts).length
    const totalOrders = ordersList.length

    // 计算平均订单数
    const avgOrdersPerWorker = totalWorkersActive > 0 
      ? totalOrders / totalWorkersActive 
      : 0

    // 计算总体拒单率和异常率
    const totalRejects = Object.values(workerRejectCounts).reduce((sum, count) => sum + count, 0)
    const totalExceptions = Object.values(workerExceptionCounts).reduce((sum, count) => sum + count, 0)

    const rejectRate = totalOrders > 0 ? totalRejects / totalOrders : 0
    const exceptionRate = totalOrders > 0 ? totalExceptions / totalOrders : 0

    return {
      total_workers_active: totalWorkersActive,
      avg_orders_per_worker: avgOrdersPerWorker,
      reject_rate: rejectRate,
      exception_rate: exceptionRate,
    }
  } catch (error) {
    console.error("[运营指标] 计算配送员行为指标失败:", error)
    return {
      total_workers_active: 0,
      avg_orders_per_worker: 0,
      reject_rate: 0,
      exception_rate: 0,
    }
  }
}
