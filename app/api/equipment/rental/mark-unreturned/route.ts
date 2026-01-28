// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：设备未归还标记

import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { verifyCompanyAccess } from "@/lib/multi-tenant"

/**
 * POST: 标记设备为未归还
 * 请求体：
 * - rental_order_id: 租赁订单ID（必需）
 * - days_overdue: 逾期天数（可选）
 * - action: 操作类型（可选）：'send_reminder'（发送提醒）、'mark_lost'（标记为丢失）、'legal_action'（法律行动）
 * - notes: 备注（可选）
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
        console.log("[设备未归还标记API] Super Admin 访问，跳过多租户过滤")
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
      days_overdue,
      action = "mark_lost",
      notes,
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

    // 验证操作类型
    if (!['send_reminder', 'mark_lost', 'legal_action'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: "操作类型无效",
          details: "action 必须是 'send_reminder'、'mark_lost' 或 'legal_action'",
        },
        { status: 400 }
      )
    }

    // 验证订单是否存在
    const { data: order, error: orderError } = await supabaseClient
      .from("rental_orders")
      .select("id, order_status, equipment_id, end_date, provider_id, restaurant_id, start_date")
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

    // 计算逾期天数（如果没有提供）
    let finalOverdueDays = days_overdue
    if (!finalOverdueDays && order.end_date) {
      const endDate = new Date(order.end_date)
      const today = new Date()
      finalOverdueDays = Math.floor(
        (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    }

    // 根据操作类型执行不同的操作
    if (action === "mark_lost") {
      // 标记设备为丢失：更新 rental_records 表
      const { data: rentalRecords } = await supabaseClient
        .from("rental_records")
        .select("id, status")
        .eq("rental_order_id", rental_order_id)
        .in("status", ["active"]) // 只更新状态为 active 的记录

      if (rentalRecords && rentalRecords.length > 0) {
        const recordIds = rentalRecords.map((record: any) => record.id)

        const { error: updateError } = await supabaseClient
          .from("rental_records")
          .update({
            status: "lost",
            return_condition: "lost",
            notes: notes || `设备未归还，标记为丢失。逾期天数：${finalOverdueDays || '未知'}`,
            updated_at: new Date().toISOString(),
          })
          .in("id", recordIds)

        if (updateError) {
          console.error("[设备未归还标记] 更新租赁记录失败:", updateError)
          return NextResponse.json(
            {
              success: false,
              error: "更新租赁记录失败",
              details: updateError.message,
            },
            { status: 500 }
          )
        }
      } else {
        // 如果没有 rental_records，创建一个
        const { error: insertError } = await supabaseClient
          .from("rental_records")
          .insert({
            rental_order_id,
            equipment_id: order.equipment_id,
            restaurant_id: order.restaurant_id || null,
            status: "lost",
            return_condition: "lost",
            notes: notes || `设备未归还，标记为丢失。逾期天数：${finalOverdueDays || '未知'}`,
            actual_start_date: order.start_date || null,
          })

        if (insertError) {
          console.error("[设备未归还标记] 创建租赁记录失败:", insertError)
          // 不阻止流程继续
        }
      }
    }

    // 📝 记录租赁事件：设备未归还标记
    const { error: eventError } = await supabaseClient
      .from("rental_events")
      .insert({
        rental_order_id,
        event_type: "equipment_marked_unreturned",
        event_at: new Date().toISOString(),
        operator_id: currentUserId || null,
        meta: {
          equipment_id: order.equipment_id,
          action,
          days_overdue: finalOverdueDays || null,
          notes: notes || null,
        },
      })

    if (eventError) {
      console.error("[设备未归还标记] 记录事件失败:", eventError)
      // 事件记录失败不影响主流程
    } else {
      console.log(`[设备未归还标记] 📝 租赁事件已记录：equipment_marked_unreturned，订单ID: ${rental_order_id}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        rental_order_id,
        action,
        days_overdue: finalOverdueDays || null,
        equipment_id: order.equipment_id,
      },
      message: `设备未归还标记成功（操作类型：${action}）`,
    })
  } catch (err: any) {
    console.error("[设备未归还标记] 错误:", err)
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
