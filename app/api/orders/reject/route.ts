/**
 * 拒单 API
 * 阶段 2B-5：业务现实化 · 状态治理 · 可运营系统
 * 
 * POST /api/orders/reject
 * 用途：配送员拒单，将订单状态从 pending 转为 rejected
 * 逻辑要求：仅允许 pending → rejected
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
    await requireCapability(Capability.CAP_ORDER_REJECT)

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
    console.log("[拒单API] 权限验证通过，配送员:", worker.name)
    
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

    // 查询订单当前状态
    const { data: order, error: orderError } = await supabase
      .from("delivery_orders")
      .select("id, status")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      )
    }

    // ⚠️ 临时注释：暂时注释掉状态流转拦截，避免阻碍项目启动
    // 验证状态是否可以流转：pending → rejected（使用统一状态流转白名单）
    const currentStatus = (order.status || "").toLowerCase()
    // if (!canTransitionDeliveryOrderStatus(currentStatus, "rejected")) {
    //   return NextResponse.json(
    //     { 
    //       error: `订单状态 ${order.status} 无法流转到 rejected`,
    //       currentStatus: order.status,
    //       targetStatus: "rejected",
    //       orderId: order_id,
    //       hint: `当前状态 ${currentStatus} 允许流转到: ${["accepted", "rejected", "cancelled"].join(", ")}`
    //     },
    //     { status: 400 }
    //   )
    // }

    // 更新订单状态：pending → rejected
    const { data: updatedOrder, error: updateError } = await supabase
      .from("delivery_orders")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id)
      .eq("status", "pending") // 乐观锁：确保状态为 pending
      .select("id, status")
      .maybeSingle()

    if (updateError || !updatedOrder) {
      console.error("[拒单API] 更新订单失败:", updateError)
      return NextResponse.json(
        {
          error: "拒单失败",
          details: updateError?.message || "订单状态已改变或不存在",
        },
        { status: 500 }
      )
    }

    // 写入审计日志（拒单成功）- 使用规范 action_type 和完整 metadata
    try {
      await writeAuditLog({
        actor_id: worker?.id || worker_id || null,
        action: 'ORDER_REJECTED', // 阶段 2B-5：规范 action_type
        target_type: 'delivery_order',
        target_id: updatedOrder.id,
        metadata: {
          previous_status: currentStatus,
          next_status: 'rejected',
          operator_role: worker ? 'worker' : null,
          worker_id: worker_id || null,
          reason: reason || null, // 拒单原因
        },
      })
    } catch (auditError) {
      // 审计日志写入失败不影响主流程，只记录日志
      console.error('[拒单API] 写入审计日志失败:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: "拒单成功",
      data: updatedOrder,
    })
  } catch (error) {
    console.error("[拒单API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
