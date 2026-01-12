/**
 * 异常上报 API
 * 阶段 2B-5：业务现实化 · 状态治理 · 可运营系统
 * 
 * POST /api/orders/exception
 * 用途：配送员上报异常，将订单状态从 accepted/delivering 转为 exception
 * 逻辑要求：accepted / delivering → exception
 * 特点：不改变 worker 绑定
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { canTransitionDeliveryOrderStatus } from "@/lib/types/order"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"
import { requireCapability } from "@/lib/auth/requireCapability"
import { Capability } from "@/lib/capabilities"
import { writeAuditLog } from "@/lib/audit"

export async function POST(request: Request) {
  try {
    // 权限判断统一走 Capability（当前阶段默认放行，不阻断）
    await requireCapability(Capability.CAP_ORDER_EXCEPTION)

    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    
    // 验证配送员权限（系统信任模式）
    const authResult = await verifyWorkerPermission(request, "delivery", body)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const worker = authResult.worker
    console.log("[异常上报API] 权限验证通过，配送员:", worker.name)
    
    const { order_id, worker_id, reason } = body

    if (!order_id) {
      return NextResponse.json(
        { error: "缺少必要参数: order_id" },
        { status: 400 }
      )
    }

    if (!worker_id) {
      return NextResponse.json(
        { error: "缺少 worker_id" },
        { status: 400 }
      )
    }

    // 查询订单当前状态（包含 worker_id 和 assigned_to，用于验证不改变绑定）
    const { data: order, error: orderError } = await supabase
      .from("delivery_orders")
      .select("id, status, worker_id, assigned_to")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      )
    }

    // 验证状态是否可以流转：accepted / delivering → exception（使用统一状态流转白名单）
    const currentStatus = (order.status || "").toLowerCase()
    if (!canTransitionDeliveryOrderStatus(currentStatus, "exception")) {
      return NextResponse.json(
        { 
          error: `订单状态 ${order.status} 无法流转到 exception`,
          currentStatus: order.status,
          targetStatus: "exception",
          orderId: order_id,
          hint: currentStatus === "accepted" 
            ? `当前状态 ${currentStatus} 允许流转到: ${["delivering", "exception"].join(", ")}`
            : currentStatus === "delivering"
            ? `当前状态 ${currentStatus} 允许流转到: ${["completed", "exception", "returned"].join(", ")}`
            : `当前状态 ${currentStatus} 不允许流转到 exception`
        },
        { status: 400 }
      )
    }

    // 更新订单状态：accepted/delivering → exception
    // 不改变 worker_id 和 assigned_to（保持绑定）
    const { data: updatedOrder, error: updateError } = await supabase
      .from("delivery_orders")
      .update({
        status: "exception",
        updated_at: new Date().toISOString(),
        // 注意：不更新 worker_id 和 assigned_to，保持原有绑定
      })
      .eq("id", order_id)
      .in("status", ["accepted", "delivering"]) // 乐观锁：确保状态为 accepted 或 delivering
      .select("id, status, worker_id, assigned_to")
      .maybeSingle()

    if (updateError || !updatedOrder) {
      console.error("[异常上报API] 更新订单失败:", updateError)
      return NextResponse.json(
        {
          error: "异常上报失败",
          details: updateError?.message || "订单状态已改变或不存在",
        },
        { status: 500 }
      )
    }

    // 写入审计日志（异常上报成功）- 使用规范 action_type 和完整 metadata
    try {
      await writeAuditLog({
        actor_id: worker?.id || worker_id || null,
        action: 'ORDER_EXCEPTION', // 阶段 2B-5：规范 action_type
        target_type: 'delivery_order',
        target_id: updatedOrder.id,
        metadata: {
          previous_status: currentStatus,
          next_status: 'exception',
          operator_role: worker ? 'worker' : null,
          worker_id: worker_id || null,
          reason: reason || null, // 异常原因（如：交通事故 / 钢瓶异常 / 客户拒收）
        },
      })
    } catch (auditError) {
      // 审计日志写入失败不影响主流程，只记录日志
      console.error('[异常上报API] 写入审计日志失败:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: "异常上报成功",
      data: updatedOrder,
    })
  } catch (error) {
    console.error("[异常上报API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
