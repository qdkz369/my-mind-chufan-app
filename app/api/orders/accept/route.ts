// ACCESS_LEVEL: STAFF_LEVEL
// ALLOWED_ROLES: staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：只能 staff 调用，必须绑定 worker_id / assigned_to，后续必须使用 RLS 限制只能访问自己数据

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { canTransitionDeliveryOrderStatus } from "@/lib/types/order"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"
import { requireCapability } from "@/lib/auth/requireCapability"
import { Capability } from "@/lib/capabilities"
import { writeAuditLog } from "@/lib/audit"

/**
 * POST: 配送员接单
 * 将订单状态从 pending 转为 accepted
 * 需要配送员权限
 * 系统信任模式：直接使用 worker_id，不走 Supabase Auth
 */
export async function POST(request: Request) {
  try {
    // 权限判断统一走 Capability（当前阶段默认放行，不阻断）
    await requireCapability(Capability.ORDER_ACCEPT)

    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    
    // 验证配送员权限
    const authResult = await verifyWorkerPermission(request, "delivery", body)
    if (authResult instanceof NextResponse) {
      return authResult // 返回错误响应
    }
    const worker = authResult.worker
    console.log("[接单API] 权限验证通过，配送员:", worker.name)
    
    // 系统信任模式：直接使用 worker_id（来自请求体）
    const { order_id, worker_id } = body

    if (!worker_id) {
      return NextResponse.json(
        { error: "缺少 worker_id" },
        { status: 400 }
      )
    }

    if (!order_id) {
      return NextResponse.json(
        { error: "缺少必要参数: order_id" },
        { status: 400 }
      )
    }

    // 查询订单当前状态（统一使用小写pending进行匹配）
    const { data: order, error: orderError } = await supabase
      .from("delivery_orders")
      .select("id, status, restaurant_id, worker_id, assigned_to")
      .eq("id", order_id)
      .single()

    if (orderError) {
      console.error("[接单API] 查询订单失败:", orderError)
      return NextResponse.json(
        { 
          error: "订单不存在",
          details: orderError.message,
          hint: orderError.hint || "可能是订单ID错误或RLS策略限制"
        },
        { status: 404 }
      )
    }

    if (!order) {
      console.error("[接单API] 订单不存在，order_id:", order_id)
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      )
    }

    console.log("[接单API] 订单当前状态:", {
      id: order.id,
      status: order.status,
      worker_id: order.worker_id,
      assigned_to: order.assigned_to
    })

    // 统一状态为小写进行比较（确保不区分大小写）
    const currentStatus = (order.status || "").toLowerCase()
    
    // 验证状态是否可以流转：使用统一状态流转白名单（禁止硬编码）
    if (!canTransitionDeliveryOrderStatus(currentStatus, "accepted")) {
      console.warn("[接单API] 状态流转失败:", {
        currentStatus,
        targetStatus: "accepted",
        orderId: order_id
      })
      return NextResponse.json(
        { 
          error: `订单状态 ${order.status} 无法流转到 accepted`,
          currentStatus: order.status,
          targetStatus: "accepted",
          orderId: order_id,
          hint: `当前状态 ${currentStatus} 允许流转到: ${["accepted", "rejected", "cancelled"].join(", ")}`
        },
        { status: 400 }
      )
    }

    // 更新订单状态：pending -> accepted
    // 系统信任模式：统一使用 worker_id
    console.log('正在尝试接单，订单ID:', order_id, 'Worker ID:', worker_id)
    const { data: updatedOrder, error: updateError } = await supabase
      .from("delivery_orders")
      .update({
        status: "accepted",
        worker_id: worker_id,
        assigned_to: worker_id,
        customer_confirmed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id)
      .eq("status", "pending")
      .select("id, status, worker_id")
      .maybeSingle()

    if (updateError) {
      console.error("[接单API] 更新订单失败:", updateError)
      return NextResponse.json(
        {
          error: "更新订单失败",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    // 如果更新影响行数为0（查询不到记录），返回400
    if (!updatedOrder) {
      // 打印调试信息：查询数据库中的实际内容
      const { data: actualOrder } = await supabase
        .from("delivery_orders")
        .select("id, status, worker_id, assigned_to, restaurant_id")
        .eq("id", order_id)
        .maybeSingle()
      
      console.log("[接单API] 更新失败 - 订单ID:", order_id, "数据库中的实际内容:", actualOrder)
      
      // 根据实际情况提供更详细的错误信息
      let errorMessage = "订单不存在或状态不允许"
      let errorDetails = "无法更新订单状态，可能订单不存在或当前状态不允许接单"
      
      if (actualOrder) {
        if (actualOrder.status !== "pending") {
          errorMessage = `订单状态已改变，当前状态为：${actualOrder.status}`
          errorDetails = `订单状态已从 pending 变为 ${actualOrder.status}，无法接单。可能已被其他配送员接单。`
        } else if (actualOrder.worker_id || actualOrder.assigned_to) {
          errorMessage = "订单已被其他配送员接单"
          errorDetails = `订单已被配送员 ${actualOrder.worker_id || actualOrder.assigned_to} 接单`
        } else {
          errorMessage = "无法更新订单，可能是RLS策略限制"
          errorDetails = "订单状态为pending，但更新操作失败，可能是RLS策略限制了更新权限"
        }
      }
      
      return NextResponse.json(
        {
          error: errorMessage,
          details: errorDetails,
          currentOrder: actualOrder || null,
        },
        { status: 400 }
      )
    }

    // 写入审计日志（接单成功）- 使用规范 action_type 和完整 metadata
    try {
      await writeAuditLog({
        actor_id: worker?.id || worker_id || null,
        action: 'ORDER_ACCEPTED', // 阶段 2B-5：规范 action_type
        target_type: 'delivery_order',
        target_id: updatedOrder.id,
        metadata: {
          previous_status: currentStatus,
          next_status: 'accepted',
          operator_role: worker ? 'worker' : null,
          worker_id: worker_id || null,
        },
      })
    } catch (auditError) {
      // 审计日志写入失败不影响主流程，只记录日志
      console.error('[接单API] 写入审计日志失败:', auditError)
    }

    return NextResponse.json({
      success: true,
      message: "接单成功",
      data: updatedOrder,
    })
  } catch (error) {
    console.error("[确认验收API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

