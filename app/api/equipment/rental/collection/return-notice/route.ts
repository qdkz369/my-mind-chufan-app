// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：设备归还催收通知

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentUserId, getCurrentCompanyId, verifyCompanyAccess } from "@/lib/multi-tenant"

/**
 * POST: 发送设备归还催收通知
 * 请求体：
 * - rental_order_id: 租赁订单ID（必需）
 * - notification_type: 通知类型（必需）：'sms'（短信）、'email'（邮件）、'phone'（电话）、'in_app'（站内信）
 * - days_overdue: 逾期天数（可选，自动计算）
 * - message: 催收消息内容（可选，不提供则使用默认模板）
 * - recipient_phone: 收件人电话（可选）
 * - recipient_email: 收件人邮箱（可选）
 */
export async function POST(request: Request) {
  try {
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
      notification_type,
      days_overdue,
      message,
      recipient_phone,
      recipient_email,
    } = body

    // 验证必需字段
    if (!rental_order_id || !notification_type) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "rental_order_id 和 notification_type 为必填项",
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

    // 验证订单是否存在
    const { data: order, error: orderError } = await supabaseClient
      .from("rental_orders")
      .select("id, order_number, restaurant_id, equipment_id, end_date, contact_phone, provider_id")
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

    // 🔒 多租户隔离：验证用户是否有权限操作此订单
    const currentUserId = await getCurrentUserId(request)
    const currentCompanyId = await getCurrentCompanyId(request)

    if (order.provider_id && currentUserId && currentCompanyId) {
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

    // 计算逾期天数（如果没有提供）
    let finalOverdueDays = days_overdue
    if (!finalOverdueDays && order.end_date) {
      const endDate = new Date(order.end_date)
      const today = new Date()
      finalOverdueDays = Math.floor(
        (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    // 生成催收消息（如果没有提供）
    let finalMessage = message
    if (!finalMessage) {
      finalMessage = `【设备归还催收通知】\n` +
        `订单号：${order.order_number}\n` +
        `租赁结束日期：${order.end_date || '未知'}\n` +
        `逾期天数：${finalOverdueDays || '未知'} 天\n` +
        `请尽快归还设备，感谢配合！`
    }

    // 获取收件人信息（从订单或请求参数）
    const finalPhone = recipient_phone || order.contact_phone
    const finalEmail = recipient_email

    // 📝 记录催收通知（记录到 rental_events）
    const { error: eventError } = await supabaseClient
      .from("rental_events")
      .insert({
        rental_order_id,
        event_type: "return_collection_notification_sent",
        event_at: new Date().toISOString(),
        operator_id: currentUserId || null,
        meta: {
          notification_type,
          message: finalMessage,
          recipient_phone: finalPhone,
          recipient_email: finalEmail,
          days_overdue: finalOverdueDays || null,
          equipment_id: order.equipment_id,
          collection_result: "sent",
        },
      })

    if (eventError) {
      console.error("[设备归还催收] 记录事件失败:", eventError)
      // 事件记录失败不影响主流程
    } else {
      console.log(`[设备归还催收] 📝 催收通知已记录，订单ID: ${rental_order_id}，通知类型: ${notification_type}`)
    }

    // TODO: 实际发送通知（短信/邮件/电话）
    // 这里只记录，实际发送需要集成第三方服务

    return NextResponse.json({
      success: true,
      data: {
        rental_order_id,
        notification_type,
        message: finalMessage,
        recipient_phone: finalPhone,
        recipient_email: finalEmail,
        days_overdue: finalOverdueDays || null,
        sent_at: new Date().toISOString(),
      },
      message: `设备归还催收通知已发送（类型：${notification_type}）`,
      note: "注意：当前版本仅记录通知，实际发送功能需要集成第三方服务（短信/邮件/电话）",
    })
  } catch (err: any) {
    console.error("[设备归还催收] 错误:", err)
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
