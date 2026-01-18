// ACCESS_LEVEL: INTERNAL / SERVICE_ROLE
// ALLOWED_ROLES: service_role (定时任务调用)
// CURRENT_KEY: Service Role Key (必须)
// TARGET_KEY: Service Role Key
// 说明：逾期账期自动标记定时任务（可手动调用或由外部定时任务服务调用）

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST: 检查并标记逾期账期
 * 功能：
 * - 查询所有 due_date < 今天 且 status IN ('pending', 'partial') 的账期
 * - 自动更新 status = 'overdue'
 * - 返回更新的账期数量和详情
 * 
 * 请求体（可选）：
 * - dry_run: 是否仅模拟运行（不实际更新）（默认：false）
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
    const { dry_run = false, batch_size = 100 } = body

    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD

    // 查询所有需要标记为逾期的账期
    // 条件：due_date < 今天 且 status IN ('pending', 'partial')
    const { data: overdueBillingCycles, error: queryError } = await supabaseClient
      .from("rental_billing_cycles")
      .select("id, rental_order_id, cycle_month, due_date, amount_due, amount_paid, status")
      .lt("due_date", today)
      .in("status", ["pending", "partial"])
      .limit(batch_size)

    if (queryError) {
      console.error("[逾期账期检测] 查询失败:", queryError)
      return NextResponse.json(
        {
          success: false,
          error: "查询逾期账期失败",
          details: queryError.message,
        },
        { status: 500 }
      )
    }

    if (!overdueBillingCycles || overdueBillingCycles.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          updated_count: 0,
          overdue_cycles: [],
          message: "没有需要标记为逾期的账期",
        },
        dry_run,
      })
    }

    // 如果是模拟运行，只返回结果不实际更新
    if (dry_run) {
      return NextResponse.json({
        success: true,
        data: {
          updated_count: overdueBillingCycles.length,
          overdue_cycles: overdueBillingCycles.map(cycle => ({
            id: cycle.id,
            rental_order_id: cycle.rental_order_id,
            cycle_month: cycle.cycle_month,
            due_date: cycle.due_date,
            amount_due: cycle.amount_due,
            amount_paid: cycle.amount_paid,
            overdue_days: Math.floor(
              (new Date().getTime() - new Date(cycle.due_date).getTime()) / (1000 * 60 * 60 * 24)
            ),
          })),
          message: `模拟运行：发现 ${overdueBillingCycles.length} 个逾期账期（未实际更新）`,
        },
        dry_run: true,
      })
    }

    // 实际更新状态为 'overdue'
    const cycleIds = overdueBillingCycles.map(cycle => cycle.id)
    
    const { data: updatedCycles, error: updateError } = await supabaseClient
      .from("rental_billing_cycles")
      .update({
        status: "overdue",
        updated_at: new Date().toISOString(),
      })
      .in("id", cycleIds)
      .select("id, rental_order_id, cycle_month, due_date, amount_due, amount_paid, status")

    if (updateError) {
      console.error("[逾期账期检测] 更新失败:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: "更新逾期账期状态失败",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    // 计算逾期天数
    const overdueCycles = updatedCycles.map(cycle => ({
      id: cycle.id,
      rental_order_id: cycle.rental_order_id,
      cycle_month: cycle.cycle_month,
      due_date: cycle.due_date,
      amount_due: cycle.amount_due,
      amount_paid: cycle.amount_paid,
      overdue_days: Math.floor(
        (new Date().getTime() - new Date(cycle.due_date).getTime()) / (1000 * 60 * 60 * 24)
      ),
      amount_overdue: parseFloat(cycle.amount_due?.toString() || "0") - parseFloat(cycle.amount_paid?.toString() || "0"),
    }))

    console.log(`[逾期账期检测] ✅ 已标记 ${updatedCycles.length} 个逾期账期`)

    return NextResponse.json({
      success: true,
      data: {
        updated_count: updatedCycles.length,
        overdue_cycles: overdueCycles,
        message: `成功标记 ${updatedCycles.length} 个逾期账期`,
      },
      dry_run: false,
    })
  } catch (err: any) {
    console.error("[逾期账期检测] 错误:", err)
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
 * GET: 查询逾期账期（便捷接口）
 * 查询参数：
 * - dry_run: 是否仅模拟运行（默认：false）
 */
export async function GET(request: Request) {
  // GET 方法作为便捷接口，实际执行检查但不更新（dry_run=true）
  const requestUrl = new URL(request.url)
  const dryRun = requestUrl.searchParams.get("dry_run") === "true"

  // 构造 POST 请求体
  const mockRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ dry_run: dryRun }),
  })

  return POST(mockRequest)
}
