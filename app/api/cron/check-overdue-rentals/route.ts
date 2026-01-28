// ACCESS_LEVEL: INTERNAL / SERVICE_ROLE
// ALLOWED_ROLES: service_role (定时任务调用)
// CURRENT_KEY: Service Role Key (必须)
// TARGET_KEY: Service Role Key
// 说明：设备未归还自动检测定时任务（可手动调用或由外部定时任务服务调用）

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST: 检查并标记未归还设备
 * 功能：
 * - 查询所有 end_date < 今天 且 order_status = 'active' 的订单
 * - 计算逾期天数
 * - 返回逾期订单列表（可选：自动标记为未归还）
 * 
 * 请求体（可选）：
 * - dry_run: 是否仅模拟运行（不实际标记）（默认：false）
 * - auto_mark: 是否自动标记未归还（默认：false）
 * - min_overdue_days: 最小逾期天数（默认：0，表示只要逾期就标记）
 * - batch_size: 批量处理数量（默认：100）
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase Service Role Key 未配置",
        },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const body = await request.json().catch(() => ({}))
    const { dry_run = false, auto_mark = false, min_overdue_days = 0, batch_size = 100 } = body

    const today = new Date()
    today.setHours(0, 0, 0, 0) // 设置为当天0点
    const todayStr = today.toISOString().split("T")[0] // YYYY-MM-DD

    // 查询所有逾期的租赁订单
    // 条件：end_date < 今天 且 order_status = 'active'
    const { data: overdueOrders, error: queryError } = await supabaseClient
      .from("rental_orders")
      .select("id, order_number, restaurant_id, equipment_id, end_date, order_status")
      .lt("end_date", todayStr)
      .eq("order_status", "active")
      .limit(batch_size)

    if (queryError) {
      console.error("[设备未归还检测] 查询失败:", queryError)
      return NextResponse.json(
        {
          success: false,
          error: "查询逾期订单失败",
          details: queryError.message,
        },
        { status: 500 }
      )
    }

    if (!overdueOrders || overdueOrders.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          checked_count: 0,
          overdue_orders: [],
          message: "没有逾期的租赁订单",
        },
        dry_run,
      })
    }

    // 计算每个订单的逾期天数
    const overdueOrderDetails = overdueOrders.map((order: any) => {
      const endDate = new Date(order.end_date)
      endDate.setHours(0, 0, 0, 0)
      const overdueDays = Math.floor(
        (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        ...order,
        overdue_days: overdueDays,
      }
    }).filter((order: any) => order.overdue_days >= min_overdue_days) // 过滤最小逾期天数

    if (overdueOrderDetails.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          checked_count: overdueOrders.length,
          overdue_orders: [],
          message: `检查了 ${overdueOrders.length} 个订单，但没有满足最小逾期天数（${min_overdue_days}天）的订单`,
        },
        dry_run,
      })
    }

    // 如果是模拟运行，只返回结果不实际标记
    if (dry_run) {
      return NextResponse.json({
        success: true,
        data: {
          checked_count: overdueOrders.length,
          overdue_orders: overdueOrderDetails,
          message: `模拟运行：发现 ${overdueOrderDetails.length} 个逾期订单（未实际标记）`,
        },
        dry_run: true,
      })
    }

    // 如果需要自动标记，更新 rental_records 表
    if (auto_mark) {
      const orderIds = overdueOrderDetails.map((order: any) => order.id)

      // 查询这些订单对应的 rental_records
      const { data: rentalRecords } = await supabaseClient
        .from("rental_records")
        .select("id, rental_order_id, status")
        .in("rental_order_id", orderIds)
        .in("status", ["active"]) // 只更新状态为 active 的记录

      if (rentalRecords && rentalRecords.length > 0) {
        const recordIds = rentalRecords.map((record: any) => record.id)

        // 更新 rental_records 状态为 'lost'（设备未归还）
        const { error: updateError } = await supabaseClient
          .from("rental_records")
          .update({
            status: "lost",
            return_condition: "lost",
            updated_at: new Date().toISOString(),
          })
          .in("id", recordIds)

        if (updateError) {
          console.error("[设备未归还检测] 更新租赁记录失败:", updateError)
          // 记录错误但不阻止返回结果
        } else {
          console.log(`[设备未归还检测] ✅ 已标记 ${rentalRecords.length} 条租赁记录为未归还`)
        }
      }

      // 记录未归还事件
      for (const order of overdueOrderDetails) {
        const { error: eventError } = await supabaseClient
          .from("rental_events")
          .insert({
            rental_order_id: order.id,
            event_type: "equipment_marked_unreturned",
            event_at: new Date().toISOString(),
            operator_id: null, // 系统自动标记
            meta: {
              equipment_id: order.equipment_id,
              overdue_days: order.overdue_days,
              end_date: order.end_date,
              auto_marked: true,
            },
          })
        
        if (eventError) {
          console.error(`[设备未归还检测] 记录事件失败（订单ID: ${order.id}）:`, eventError)
        }
      }
    }

    console.log(`[设备未归还检测] ✅ 检测完成：发现 ${overdueOrderDetails.length} 个逾期订单`)

    return NextResponse.json({
      success: true,
      data: {
        checked_count: overdueOrders.length,
        overdue_orders: overdueOrderDetails,
        marked_count: auto_mark ? overdueOrderDetails.length : 0,
        message: `检测完成：发现 ${overdueOrderDetails.length} 个逾期订单${auto_mark ? `，已标记为未归还` : ''}`,
      },
      dry_run: false,
    })
  } catch (err: any) {
    console.error("[设备未归还检测] 错误:", err)
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

/**
 * GET: 查询逾期订单（便捷接口）
 * 查询参数：
 * - dry_run: 是否仅模拟运行（默认：false）
 * - auto_mark: 是否自动标记（默认：false）
 * - min_overdue_days: 最小逾期天数（默认：0）
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const dryRun = requestUrl.searchParams.get("dry_run") === "true"
  const autoMark = requestUrl.searchParams.get("auto_mark") === "true"
  const minOverdueDays = parseInt(requestUrl.searchParams.get("min_overdue_days") || "0")

  // 构造 POST 请求体
  const mockRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ dry_run: dryRun, auto_mark: autoMark, min_overdue_days: minOverdueDays }),
  })

  return POST(mockRequest)
}
