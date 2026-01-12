/**
 * 异常态监控接口
 * 阶段 2B-6：运营可观测性 · 系统自省 · 决策接口层
 * 
 * GET /api/ops/exceptions
 * 
 * 返回：
 * {
 *   "exception_orders": [
 *     {
 *       "order_id": "...",
 *       "status": "exception",
 *       "worker_id": "...",
 *       "last_action": "ORDER_EXCEPTION",
 *       "reason": "...",
 *       "created_at": "..."
 *     }
 *   ]
 * }
 * 
 * 数据来源：audit_logs + delivery_orders
 * 只返回当前仍处于 exception 状态的订单
 * 
 * 权限：暂不强制 RBAC，但记录 audit_logs（action_type = OPS_QUERY）
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { writeAuditLog } from "@/lib/audit"
import { supabaseServer } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    // 权限判断统一走 Capability（当前阶段默认放行，不阻断）
    // 注意：ops API 暂不强制 RBAC，但仍尝试获取用户信息用于审计日志
    let operatorId: string | null = null
    try {
      const supabaseAuth = await supabaseServer()
      const { data: { user } } = await supabaseAuth.auth.getUser()
      operatorId = user?.id || null
    } catch (error) {
      // 未认证不影响查询，只记录日志
      console.log("[异常态监控API] 未认证用户访问（允许继续）")
    }

    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "数据库连接失败",
          exception_orders: [],
        },
        { status: 200 } // 即使出错也返回 200，确保运营系统稳定性
      )
    }

    // 1. 查询所有当前处于 exception 状态的订单
    const { data: exceptionOrders, error: ordersError } = await supabase
      .from("delivery_orders")
      .select("id, status, worker_id, created_at, updated_at")
      .eq("status", "exception")

    if (ordersError) {
      console.error("[异常态监控API] 查询异常订单失败:", ordersError)
      return NextResponse.json(
        {
          success: false,
          error: "查询异常订单失败",
          details: ordersError.message,
          exception_orders: [],
        },
        { status: 200 } // 即使出错也返回 200，确保运营系统稳定性
      )
    }

    const ordersList = exceptionOrders || []

    if (ordersList.length === 0) {
      // 写入审计日志（即使无数据也记录查询行为）
      try {
        await writeAuditLog({
          actor_id: operatorId,
          action: "OPS_QUERY",
          target_type: "ops_exceptions",
          target_id: null,
          metadata: {
            query_type: "exceptions",
            operator_id: operatorId,
            result_count: 0,
            timestamp: new Date().toISOString(),
          },
        })
      } catch (auditError) {
        console.error("[异常态监控API] 写入审计日志失败:", auditError)
      }

      return NextResponse.json({
        success: true,
        exception_orders: [],
        meta: {
          count: 0,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // 2. 查询这些订单的最新异常上报记录（从 audit_logs）
    const orderIds = ordersList.map((o: any) => o.id)

    const { data: exceptionLogs, error: logsError } = await supabase
      .from("audit_logs")
      .select("target_id, action, created_at, metadata")
      .in("target_id", orderIds)
      .eq("action", "ORDER_EXCEPTION")
      .order("created_at", { ascending: false }) // 按时间倒序，取最新的

    if (logsError) {
      console.error("[异常态监控API] 查询异常日志失败:", logsError)
      // 即使查询日志失败，也返回订单基本信息
    }

    const logsList = exceptionLogs || []

    // 3. 构建返回数据（合并订单和日志信息）
    const exceptionOrdersWithDetails = ordersList.map((order: any) => {
      // 找到该订单的最新异常上报记录
      const latestLog = logsList.find((log: any) => log.target_id === order.id)

      return {
        order_id: order.id,
        status: order.status,
        worker_id: order.worker_id || null,
        last_action: latestLog?.action || "ORDER_EXCEPTION",
        reason: latestLog?.metadata?.reason || null, // 从 metadata 中提取 reason
        created_at: order.created_at,
        exception_reported_at: latestLog?.created_at || order.updated_at,
      }
    })

    // 写入审计日志（记录查询行为）
    try {
      await writeAuditLog({
        actor_id: operatorId,
        action: "OPS_QUERY",
        target_type: "ops_exceptions",
        target_id: null,
        metadata: {
          query_type: "exceptions",
          operator_id: operatorId,
          result_count: exceptionOrdersWithDetails.length,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (auditError) {
      // 审计日志写入失败不影响主流程，只记录日志
      console.error("[异常态监控API] 写入审计日志失败:", auditError)
    }

    return NextResponse.json({
      success: true,
      exception_orders: exceptionOrdersWithDetails,
      meta: {
        count: exceptionOrdersWithDetails.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[异常态监控API] 处理请求时出错:", error)
    // 即使出错也返回 200，但标记错误（运营系统需要稳定性）
    return NextResponse.json(
      {
        success: false,
        error: "查询异常订单失败",
        details: error instanceof Error ? error.message : "未知错误",
        exception_orders: [],
      },
      { status: 200 } // 即使出错也返回 200，确保运营系统稳定性
    )
  }
}
