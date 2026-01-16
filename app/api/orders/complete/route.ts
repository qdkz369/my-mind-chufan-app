// ACCESS_LEVEL: STAFF_LEVEL
// ALLOWED_ROLES: staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：只能 staff 调用，必须绑定 worker_id / assigned_to，后续必须使用 RLS 限制只能访问自己数据

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { canTransitionDeliveryOrderStatus } from "@/lib/types/order"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"
import { CONFIG_REQUIRE_ASSET_TRACE } from "@/lib/config/asset-trace"
import { requireCapability } from "@/lib/auth/requireCapability"
import { Capability } from "@/lib/capabilities"
import { writeAuditLog } from "@/lib/audit"
import { createOrderStatusNotification } from "@/lib/notifications/create-notification"

/**
 * POST: 完成配送
 * 将订单状态从 delivering 转为 completed
 * 需要提供 tracking_code 和 proof_image
 * 需要配送员权限
 * 系统信任模式：直接使用 worker_id，不走 Supabase Auth
 */
export async function POST(request: Request) {
  try {
    // 权限判断统一走 Capability（当前阶段默认放行，不阻断）
    await requireCapability(Capability.ORDER_COMPLETE)

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
    console.log("[完成配送API] 权限验证通过，配送员:", worker.name)
    
    // 系统信任模式：直接使用 worker_id（来自请求体，如果需要）
    const { order_id, tracking_code, proof_image, worker_id, asset_ids } = body

    if (!order_id) {
      return NextResponse.json(
        { error: "缺少必要参数: order_id" },
        { status: 400 }
      )
    }

    // 验证必要字段（配送完成必须提供溯源码和凭证）
    if (!tracking_code || !proof_image) {
      return NextResponse.json(
        { error: "完成配送必须提供 tracking_code 和 proof_image" },
        { status: 400 }
      )
    }

    // 资产溯源校验（根据配置开关决定是否强制）
    if (CONFIG_REQUIRE_ASSET_TRACE) {
      // 严格模式：必须提供 asset_ids
      if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
        return NextResponse.json(
          { error: "资产溯源模式已启用，必须提供 asset_ids" },
          { status: 400 }
        )
      }

      // 验证 asset_ids 对应的 gas_cylinders 是否存在且状态合法
      const { data: cylinders, error: cylindersError } = await supabase
        .from("gas_cylinders")
        .select("id, status")
        .in("id", asset_ids)

      if (cylindersError || !cylinders || cylinders.length !== asset_ids.length) {
        return NextResponse.json(
          { 
            error: "资产校验失败",
            details: "部分资产不存在或无法访问",
            provided_count: asset_ids.length,
            found_count: cylinders?.length || 0
          },
          { status: 400 }
        )
      }

      // 可以在这里添加更详细的状态校验逻辑（如果需要）
      // 例如：检查 gas_cylinders.status 是否符合配送要求
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

    // 验证状态是否可以流转：使用统一状态流转白名单（禁止硬编码）
    const currentStatus = (order.status || "").toLowerCase()
    if (!canTransitionDeliveryOrderStatus(currentStatus, "completed")) {
      return NextResponse.json(
        { 
          error: `订单状态 ${order.status} 无法流转到 completed`,
          currentStatus: order.status,
          targetStatus: "completed",
          orderId: order_id,
          hint: `当前状态 ${currentStatus} 允许流转到: ${["completed", "exception", "returned"].join(", ")}`
        },
        { status: 400 }
      )
    }

    // 更新订单状态和配送信息（使用小写字符串）
    const { data: updatedOrder, error: updateError } = await supabase
      .from("delivery_orders")
      .update({
        status: "completed",
        tracking_code: tracking_code,
        proof_image: proof_image,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id)
      .eq("status", currentStatus) // 乐观锁：确保状态为当前状态（使用变量，不硬编码）
      .select("id, status, tracking_code, proof_image, updated_at")
      .single()

    if (updateError || !updatedOrder) {
      console.error("[完成配送API] 更新订单失败:", updateError)
      return NextResponse.json(
        {
          error: "更新订单失败",
          details: updateError?.message || "订单状态已改变或不存在",
        },
        { status: 500 }
      )
    }

    // 阶段 2B-5：完善 asset_ids 的非阻断接入
    // 若传入 asset_ids：写入 trace_logs + 更新 gas_cylinders.status
    // 若未传入：不报错，不影响订单完成
    if (asset_ids && Array.isArray(asset_ids) && asset_ids.length > 0) {
      // 使用 worker.id 或 worker_id（系统信任模式）
      const operatorId = worker?.id || worker_id || null
      
      // 1. 写入 trace_logs（资产溯源记录）
      const traceLogs = asset_ids.map((assetId: string) => ({
        asset_id: assetId,
        operator_id: operatorId,
        action_type: "配送",
        order_id: order_id,
        created_at: new Date().toISOString(),
      }))

      const { error: traceError } = await supabase
        .from("trace_logs")
        .insert(traceLogs)

      if (traceError) {
        console.error("[完成配送API] 写入溯源记录失败:", traceError)
        // 溯源记录写入失败不影响订单完成，只记录日志
      } else {
        console.log("[完成配送API] 资产溯源记录已写入，asset_ids:", asset_ids)
      }

      // 2. 更新 gas_cylinders.status = "持有"（非阻断）
      try {
        const { error: updateCylinderError } = await supabase
          .from("gas_cylinders")
          .update({ status: "持有" })
          .in("id", asset_ids)

        if (updateCylinderError) {
          console.error("[完成配送API] 更新 gas_cylinders 状态失败:", updateCylinderError)
          // 更新失败不影响订单完成，只记录日志
        } else {
          console.log("[完成配送API] gas_cylinders 状态已更新为'持有'，asset_ids:", asset_ids)
        }
      } catch (updateError) {
        console.error("[完成配送API] 更新 gas_cylinders 状态异常:", updateError)
        // 异常不影响订单完成
      }
    }

    // 写入审计日志（完成配送成功）- 使用规范 action_type 和完整 metadata
    try {
      await writeAuditLog({
        actor_id: worker?.id || worker_id || null,
        action: 'ORDER_COMPLETED', // 阶段 2B-5：规范 action_type
        target_type: 'delivery_order',
        target_id: updatedOrder.id,
        metadata: {
          previous_status: currentStatus,
          next_status: 'completed',
          operator_role: worker ? 'worker' : null,
          worker_id: worker_id || null,
          asset_ids: asset_ids ?? [], // 资产溯源信息
        },
      })
    } catch (auditError) {
      // 审计日志写入失败不影响主流程，只记录日志
      console.error('[完成配送API] 写入审计日志失败:', auditError)
    }

    // 创建订单状态变更通知（非阻断）
    try {
      const { data: orderDetail } = await supabase
        .from("delivery_orders")
        .select("order_number, restaurant_id")
        .eq("id", order_id)
        .single()

      if (orderDetail) {
        await createOrderStatusNotification(
          orderDetail.restaurant_id,
          order_id,
          orderDetail.order_number || order_id.substring(0, 8),
          currentStatus,
          "completed",
          "delivery"
        )
      }
    } catch (notifyError) {
      console.error('[完成配送API] 创建通知失败:', notifyError)
      // 通知创建失败不影响主流程
    }

    return NextResponse.json({
      success: true,
      message: "配送完成",
      data: updatedOrder,
    })
  } catch (error) {
    console.error("[完成配送API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

