/**
 * 系统健康扫描器
 * 阶段 2B-6：运营可观测性 · 系统自省 · 决策接口层
 * 
 * 核心原则：
 * - 只读操作，不写数据库
 * - 不自动处理，不修改状态
 * - 只暴露"风险事实"
 */

import { supabase } from "@/lib/supabase"

/**
 * 系统风险扫描结果
 */
export interface SystemRisks {
  stale_pending_orders: number        // pending 超过 24h
  long_delivering_orders: number      // delivering 超过 6h
  high_exception_workers: string[]    // exception 率异常的 worker_id
}

/**
 * 扫描系统风险
 * 
 * 规则：
 * - pending > 24h → 风险
 * - delivering > 6h → 风险
 * - 某 worker 7 天内 exception / total > 30% → 风险
 * 
 * @returns 系统风险扫描结果
 */
export async function scanSystemRisks(): Promise<SystemRisks> {
  try {
    if (!supabase) {
      throw new Error("数据库连接失败")
    }

    const now = new Date()

    // 1. 扫描 stale_pending_orders（pending 超过 24h）
    const pendingThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const { data: stalePending, error: stalePendingError } = await supabase
      .from("delivery_orders")
      .select("id")
      .eq("status", "pending")
      .lt("created_at", pendingThreshold.toISOString())

    const stalePendingCount = stalePendingError ? 0 : (stalePending?.length || 0)

    // 2. 扫描 long_delivering_orders（delivering 超过 6h）
    // 需要从 audit_logs 中查找 ORDER_DISPATCHED 的时间
    const deliveringThreshold = new Date(now.getTime() - 6 * 60 * 60 * 1000)

    // 先查询所有 delivering 状态的订单
    const { data: deliveringOrders, error: deliveringOrdersError } = await supabase
      .from("delivery_orders")
      .select("id")
      .eq("status", "delivering")

    let longDeliveringCount = 0

    if (!deliveringOrdersError && deliveringOrders && deliveringOrders.length > 0) {
      const deliveringOrderIds = deliveringOrders.map((o: any) => o.id)

      // 查询这些订单的 ORDER_DISPATCHED 日志
      const { data: dispatchLogs, error: dispatchLogsError } = await supabase
        .from("audit_logs")
        .select("target_id, created_at")
        .in("target_id", deliveringOrderIds)
        .eq("action", "ORDER_DISPATCHED")

      if (!dispatchLogsError && dispatchLogs) {
        // 按订单ID分组，找到最早的派单时间
        const dispatchTimeMap: Record<string, Date> = {}
        dispatchLogs.forEach((log: any) => {
          const orderId = log.target_id
          const dispatchTime = new Date(log.created_at)
          if (!dispatchTimeMap[orderId] || dispatchTime < dispatchTimeMap[orderId]) {
            dispatchTimeMap[orderId] = dispatchTime
          }
        })

        // 检查是否有超过 6h 的
        deliveringOrders.forEach((order: any) => {
          const dispatchTime = dispatchTimeMap[order.id]
          if (dispatchTime && dispatchTime < deliveringThreshold) {
            longDeliveringCount++
          }
        })
      } else {
        // 如果查询审计日志失败，使用订单的 updated_at 作为备选（可能不够准确）
        const { data: deliveringWithUpdated, error: deliveringWithUpdatedError } = await supabase
          .from("delivery_orders")
          .select("id, updated_at")
          .eq("status", "delivering")
          .lt("updated_at", deliveringThreshold.toISOString())

        if (!deliveringWithUpdatedError) {
          longDeliveringCount = deliveringWithUpdated?.length || 0
        }
      }
    }

    // 3. 扫描 high_exception_workers（exception 率 > 30% 的 worker）
    // 统计最近 7 天内的订单
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const { data: recentOrders, error: recentOrdersError } = await supabase
      .from("delivery_orders")
      .select("id, worker_id, status")
      .gte("created_at", sevenDaysAgo.toISOString())
      .not("worker_id", "is", null)

    const highExceptionWorkers: string[] = []

    if (!recentOrdersError && recentOrders) {
      // 按 worker_id 分组统计
      const workerStats: Record<string, { total: number, exception: number }> = {}

      recentOrders.forEach((order: any) => {
        const workerId = order.worker_id
        if (!workerId) return

        if (!workerStats[workerId]) {
          workerStats[workerId] = { total: 0, exception: 0 }
        }

        workerStats[workerId].total++

        if ((order.status || "").toLowerCase() === "exception") {
          workerStats[workerId].exception++
        }
      })

      // 找出 exception 率 > 30% 的 worker
      Object.entries(workerStats).forEach(([workerId, stats]) => {
        if (stats.total > 0) {
          const exceptionRate = stats.exception / stats.total
          if (exceptionRate > 0.3) {
            highExceptionWorkers.push(workerId)
          }
        }
      })
    }

    return {
      stale_pending_orders: stalePendingCount,
      long_delivering_orders: longDeliveringCount,
      high_exception_workers: highExceptionWorkers,
    }
  } catch (error) {
    console.error("[系统健康扫描] 扫描系统风险失败:", error)
    // 返回空风险（现实世界允许无数据）
    return {
      stale_pending_orders: 0,
      long_delivering_orders: 0,
      high_exception_workers: [],
    }
  }
}
