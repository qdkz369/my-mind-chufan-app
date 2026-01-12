/**
 * 运营总览接口
 * 阶段 2B-6：运营可观测性 · 系统自省 · 决策接口层
 * 
 * GET /api/ops/overview
 * 
 * 返回：
 * {
 *   "orders": { ...OrderOverviewMetrics },
 *   "efficiency": { ...OrderEfficiencyMetrics },
 *   "workers": { ...WorkerBehaviorMetrics }
 * }
 * 
 * 默认统计最近 7 天，参数 ?days=7 可调整
 * 
 * 权限：暂不强制 RBAC，但记录 audit_logs（action_type = OPS_QUERY）
 */

import { NextResponse } from "next/server"
import { getOrderOverviewMetrics, getOrderEfficiencyMetrics, getWorkerBehaviorMetrics } from "@/lib/ops/metrics"
import { scanSystemRisks } from "@/lib/ops/health"
import { writeAuditLog } from "@/lib/audit"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    // 权限判断统一走 Capability（当前阶段默认放行，不阻断）
    // 注意：ops API 暂不强制 RBAC，但仍尝试获取用户信息用于审计日志
    let operatorId: string | null = null
    try {
      const supabase = await supabaseServer()
      const { data: { user } } = await supabase.auth.getUser()
      operatorId = user?.id || null
    } catch (error) {
      // 未认证不影响查询，只记录日志
      console.log("[运营总览API] 未认证用户访问（允许继续）")
    }

    // 获取查询参数（降级处理：无效参数默认使用 7 天）
    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get("days")
    let days = 7 // 默认值
    
    if (daysParam) {
      const parsedDays = parseInt(daysParam, 10)
      // 验证参数是否有效（1-365 之间的整数）
      if (!isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 365) {
        days = parsedDays
      } else {
        // 参数无效，使用默认值 7 天（降级处理，不返回错误）
        console.log(`[运营总览API] 无效的 days 参数: ${daysParam}，使用默认值 7 天`)
        days = 7
      }
    }

    // 计算运营指标（只读操作，无副作用）
    const [ordersMetrics, efficiencyMetrics, workersMetrics, systemRisks] = await Promise.all([
      getOrderOverviewMetrics(),
      getOrderEfficiencyMetrics(days),
      getWorkerBehaviorMetrics(days),
      scanSystemRisks(), // 系统健康扫描
    ])

    // 写入审计日志（记录查询行为）
    try {
      await writeAuditLog({
        actor_id: operatorId,
        action: "OPS_QUERY",
        target_type: "ops_overview",
        target_id: null,
        metadata: {
          query_type: "overview",
          operator_id: operatorId,
          days: days,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (auditError) {
      // 审计日志写入失败不影响主流程，只记录日志
      console.error("[运营总览API] 写入审计日志失败:", auditError)
    }

    return NextResponse.json({
      success: true,
      data: {
        orders: ordersMetrics,
        efficiency: efficiencyMetrics,
        workers: workersMetrics,
        risks: systemRisks, // 系统风险扫描结果
      },
      meta: {
        days: days,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[运营总览API] 处理请求时出错:", error)
    // 即使出错也返回 200，但标记错误（运营系统需要稳定性）
    return NextResponse.json(
      {
        success: false,
        error: "计算运营指标失败",
        details: error instanceof Error ? error.message : "未知错误",
        data: {
          orders: {
            total_orders: 0,
            pending_orders: 0,
            active_orders: 0,
            completed_orders: 0,
            exception_orders: 0,
            cancelled_orders: 0,
            rejected_orders: 0,
          },
          efficiency: {
            avg_accept_time_minutes: null,
            avg_delivery_time_minutes: null,
            exception_rate: 0,
            completion_rate: 0,
          },
          workers: {
            total_workers_active: 0,
            avg_orders_per_worker: 0,
            reject_rate: 0,
            exception_rate: 0,
          },
          risks: {
            stale_pending_orders: 0,
            long_delivering_orders: 0,
            high_exception_workers: [],
          },
        },
      },
      { status: 200 } // 即使出错也返回 200，确保运营系统稳定性
    )
  }
}
