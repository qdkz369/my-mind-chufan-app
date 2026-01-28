// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：逾期账期催收通知

import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { verifyCompanyAccess } from "@/lib/multi-tenant"

/**
 * POST: 发送催收通知
 * 请求体：
 * - rental_order_id: 租赁订单ID（可选，如果提供则针对该订单的所有逾期账期）
 * - billing_cycle_id: 账期ID（可选，如果提供则只针对该账期）
 * - notification_type: 通知类型（必需）：'sms'（短信）、'email'（邮件）、'phone'（电话）、'in_app'（站内信）
 * - message: 催收消息内容（可选，不提供则使用默认模板）
 * - recipient_phone: 收件人电话（可选）
 * - recipient_email: 收件人邮箱（可选）
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
        console.log("[催收通知API] Super Admin 访问，跳过多租户过滤")
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
      billing_cycle_id,
      notification_type,
      message,
      recipient_phone,
      recipient_email,
    } = body

    // 验证必需字段
    if (!notification_type) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "notification_type 为必填项",
        },
        { status: 400 }
      )
    }

    // 验证通知类型
    if (!['sms', 'email', 'phone', 'in_app'].includes(notification_type)) {
      return NextResponse.json(
        {
          success: false,
          error: "通知类型无效",
          details: "notification_type 必须是 'sms'、'email'、'phone' 或 'in_app'",
        },
        { status: 400 }
      )
    }

    // 验证至少提供了 rental_order_id 或 billing_cycle_id 之一
    if (!rental_order_id && !billing_cycle_id) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "rental_order_id 或 billing_cycle_id 至少提供一个",
        },
        { status: 400 }
      )
    }

    // 🔒 统一 company_id 来源：使用 getUserContext
    const currentUserId = userContext?.userId
    const currentCompanyId = userContext?.companyId

    // 查询账期信息
    let billingCycle: any = null
    let order: any = null

    if (billing_cycle_id) {
      // 如果提供了账期ID，查询该账期
      const { data: cycle, error: cycleError } = await supabaseClient
        .from("rental_billing_cycles")
        .select(`
          *,
          rental_orders!inner(*)
        `)
        .eq("id", billing_cycle_id)
        .single()

      if (cycleError || !cycle) {
        return NextResponse.json(
          {
            success: false,
            error: "账期不存在",
            details: cycleError?.message || "未找到指定账期",
          },
          { status: 404 }
        )
      }

      billingCycle = cycle
      order = cycle.rental_orders
    } else if (rental_order_id) {
      // 如果提供了订单ID，查询订单和所有逾期账期
      const { data: orderData, error: orderError } = await supabaseClient
        .from("rental_orders")
        .select("*")
        .eq("id", rental_order_id)
        .single()

      if (orderError || !orderData) {
        return NextResponse.json(
          {
            success: false,
            error: "订单不存在",
            details: orderError?.message || "未找到指定订单",
          },
          { status: 404 }
        )
      }

      order = orderData

      // 查询该订单的所有逾期账期
      const { data: cycles, error: cyclesError } = await supabaseClient
        .from("rental_billing_cycles")
        .select("*")
        .eq("rental_order_id", rental_order_id)
        .eq("status", "overdue")

      if (!cyclesError && cycles && cycles.length > 0) {
        billingCycle = cycles[0] // 使用第一个逾期账期（或可以全部处理）
      }
    }

    // 🔒 多租户隔离：验证用户是否有权限操作此订单（super_admin 跳过）
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

    // 生成催收消息（如果没有提供）
    let finalMessage = message
    if (!finalMessage && billingCycle) {
      const dueDate = new Date(billingCycle.due_date)
      const today = new Date()
      const overdueDays = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const amountOverdue = parseFloat(billingCycle.amount_due?.toString() || "0") - 
                           parseFloat(billingCycle.amount_paid?.toString() || "0")

      finalMessage = `【租赁账期催收通知】\n` +
        `订单号：${order.order_number}\n` +
        `账期月份：${billingCycle.cycle_month}\n` +
        `逾期天数：${overdueDays} 天\n` +
        `逾期金额：${amountOverdue.toFixed(2)} 元\n` +
        `请尽快支付，感谢配合！`
    }

    // 获取收件人信息（从订单或请求参数）
    const finalPhone = recipient_phone || order.contact_phone
    const finalEmail = recipient_email

    // 📝 记录催收通知（记录到 rental_events 或创建独立的催收记录表）
    const { error: eventError } = await supabaseClient
      .from("rental_events")
      .insert({
        rental_order_id: order.id,
        event_type: "collection_notification_sent",
        event_at: new Date().toISOString(),
        operator_id: currentUserId || null,
        meta: {
          notification_type,
          message: finalMessage,
          recipient_phone: finalPhone,
          recipient_email: finalEmail,
          billing_cycle_id: billing_cycle_id || billingCycle?.id || null,
          collection_result: "sent",
        },
      })

    if (eventError) {
      console.error("[催收通知API] 记录事件失败:", eventError)
      // 事件记录失败不影响主流程
    } else {
      console.log(`[催收通知API] 📝 催收通知已记录，订单ID: ${order.id}，通知类型: ${notification_type}`)
    }

    // TODO: 实际发送通知（短信/邮件/电话）
    // 这里只记录，实际发送需要集成第三方服务
    // 示例：
    // if (notification_type === 'sms') {
    //   await sendSMS(finalPhone, finalMessage)
    // } else if (notification_type === 'email') {
    //   await sendEmail(finalEmail, '租赁账期催收通知', finalMessage)
    // }

    return NextResponse.json({
      success: true,
      data: {
        rental_order_id: order.id,
        billing_cycle_id: billing_cycle_id || billingCycle?.id || null,
        notification_type,
        message: finalMessage,
        recipient_phone: finalPhone,
        recipient_email: finalEmail,
        sent_at: new Date().toISOString(),
      },
      message: `催收通知已发送（类型：${notification_type}）`,
      note: "注意：当前版本仅记录通知，实际发送功能需要集成第三方服务（短信/邮件/电话）",
    })
  } catch (err: any) {
    console.error("[催收通知API] 错误:", err)
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
