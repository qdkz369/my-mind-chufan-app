// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：押金退款流程

import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { verifyCompanyAccess } from "@/lib/multi-tenant"

/**
 * POST: 押金退款
 * 请求体：
 * - rental_order_id: 租赁订单ID（必需）
 * - refund_amount: 退款金额（可选，不提供则使用订单的 deposit_amount）
 * - refund_reason: 退款原因（可选）
 * - refund_proof: 退款凭证（可选，图片URL或转账凭证）
 * - auto_trigger: 是否自动触发（默认：false，如果为true则从订单状态判断是否应该退款）
 */
export async function POST(request: NextRequest) {
  try {
    // P0修复：强制使用统一用户上下文获取用户身份和权限
    let userContext
    try {
      userContext = await getUserContext(request)
      if (!userContext) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      if (userContext.role === "super_admin") {
        console.log("[押金退款API] Super Admin 访问，跳过多租户过滤")
      }
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      if (errorMessage.includes("未登录")) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: errorMessage,
        },
        { status: 403 }
      )
    }

    // P0修复：强制验证 companyId（super_admin 除外）
    if (!userContext.companyId && userContext.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "用户未关联任何公司",
        },
        { status: 403 }
      )
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置",
        },
        { status: 500 }
      )
    }

    const supabaseClient = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
      : createClient(supabaseUrl, anonKey!, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })

    const body = await request.json()
    const {
      rental_order_id,
      refund_amount,
      refund_reason,
      refund_proof,
      auto_trigger = false,
    } = body

    // 验证必需字段
    if (!rental_order_id) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "rental_order_id 为必填项",
        },
        { status: 400 }
      )
    }

    // 验证订单是否存在
    const { data: order, error: orderError } = await supabaseClient
      .from("rental_orders")
      .select("id, order_status, payment_status, deposit_amount, provider_id")
      .eq("id", rental_order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        {
          success: false,
          error: "订单不存在",
          details: orderError?.message || "未找到指定订单",
        },
        { status: 404 }
      )
    }

    // 🔒 多租户隔离：验证用户是否有权限操作此订单（super_admin 跳过）
    const currentUserId = userContext?.userId
    const currentCompanyId = userContext?.companyId

    if (order.provider_id && currentUserId && currentCompanyId && userContext?.role !== "super_admin") {
      const hasAccess = await verifyCompanyAccess(currentUserId, order.provider_id)
      if (!hasAccess && order.provider_id !== currentCompanyId) {
        return NextResponse.json(
          {
            success: false,
            error: "无权操作此订单",
            details: "此订单属于其他供应商",
          },
          { status: 403 }
        )
      }
    }

    // 自动触发判断：如果订单已完成或取消，且设备完好，自动退款
    if (auto_trigger) {
      // 只有在订单完成或取消时才能自动退款
      if (!['completed', 'cancelled'].includes(order.order_status)) {
        return NextResponse.json(
          {
            success: false,
            error: "订单状态不允许自动退款",
            details: `当前订单状态为 ${order.order_status}，只有已完成或已取消的订单才能自动退款`,
          },
          { status: 400 }
        )
      }

      // 如果是取消订单，直接退款
      if (order.order_status === 'cancelled') {
        // 继续执行退款流程
      } else if (order.order_status === 'completed') {
        // 如果是完成订单，需要检查设备状态（设备完好才退款）
        // 这里简化处理，假设设备完好，实际应该查询 rental_records 表
        // 继续执行退款流程
      }
    } else {
      // 手动退款：验证订单状态（已完成或已取消的订单才能退款）
      if (!['completed', 'cancelled'].includes(order.order_status)) {
        return NextResponse.json(
          {
            success: false,
            error: "订单状态不允许退款",
            details: `当前订单状态为 ${order.order_status}，只有已完成或已取消的订单才能退款`,
          },
          { status: 400 }
        )
      }
    }

    // 验证押金是否已退款
    if (order.payment_status === 'refunded') {
      return NextResponse.json(
        {
          success: false,
          error: "押金已退款",
          details: "该订单的押金已经退款过了",
        },
        { status: 400 }
      )
    }

    // 确定退款金额（如果没有提供，使用订单的 deposit_amount）
    const orderDepositAmount = parseFloat(order.deposit_amount?.toString() || "0")
    const finalRefundAmount = refund_amount || orderDepositAmount

    if (finalRefundAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "退款金额无效",
          details: "退款金额必须大于0",
        },
        { status: 400 }
      )
    }

    // 更新订单的支付状态为 'refunded'
    const { data: updatedOrder, error: updateError } = await supabaseClient
      .from("rental_orders")
      .update({
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq("id", rental_order_id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[押金退款API] 更新订单状态失败:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: "更新订单状态失败",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    // 💰 记录押金退款到 rental_deposits 表
    const { error: depositRecordError } = await supabaseClient
      .from("rental_deposits")
      .insert({
        rental_order_id,
        deposit_type: "refunded",
        amount: finalRefundAmount,
        refund_reason: refund_reason || (auto_trigger ? "自动退款" : "手动退款"),
        refund_at: new Date().toISOString(),
        refund_proof: refund_proof || null,
        operator_id: currentUserId || null,
      })

    if (depositRecordError) {
      console.error("[押金退款API] 记录押金退款失败:", depositRecordError)
      // 押金记录失败不影响主流程，但应该记录警告
    } else {
      console.log(`[押金退款API] 💰 押金退款记录已创建：订单ID: ${rental_order_id}，金额: ${finalRefundAmount}`)
    }

    // 📝 记录租赁事件：押金退款
    const { error: eventError } = await supabaseClient
      .from("rental_events")
      .insert({
        rental_order_id,
        event_type: "deposit_refunded",
        event_at: new Date().toISOString(),
        operator_id: currentUserId || null,
        meta: {
          refund_amount: finalRefundAmount,
          refund_reason: refund_reason || (auto_trigger ? "自动退款" : "手动退款"),
          refund_proof: refund_proof || null,
          order_status: order.order_status,
          auto_trigger,
        },
      })

    if (eventError) {
      console.error("[押金退款API] 记录事件失败:", eventError)
      // 事件记录失败不影响主流程
    } else {
      console.log(`[押金退款API] 📝 租赁事件已记录：deposit_refunded，订单ID: ${rental_order_id}，金额: ${finalRefundAmount}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        rental_order_id,
        refund_amount: finalRefundAmount,
        refund_reason: refund_reason || null,
        refund_at: new Date().toISOString(),
        order_status: updatedOrder.order_status,
        payment_status: 'refunded',
      },
      message: `押金退款成功，退款金额：${finalRefundAmount} 元`,
    })
  } catch (err: any) {
    console.error("[押金退款API] 错误:", err)
    return NextResponse.json(
      {
        success: false,
        error: "服务器错误",
        details: err.message,
      },
      { status: 500 }
    )
  }
}
