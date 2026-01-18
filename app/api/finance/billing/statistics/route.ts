// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：欠款统计

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentCompanyId } from "@/lib/multi-tenant"

/**
 * GET: 查询欠款统计
 * 查询参数：
 * - restaurant_id: 餐厅ID（可选）
 * - include_pending: 是否包含待支付账期（默认：false，只统计逾期账期）
 */
export async function GET(request: Request) {
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

    const requestUrl = new URL(request.url)
    const restaurantId = requestUrl.searchParams.get("restaurant_id")
    const includePending = requestUrl.searchParams.get("include_pending") === "true"

    // 多租户隔离：获取当前用户的 company_id
    const currentCompanyId = await getCurrentCompanyId(request)

    // 构建查询条件：逾期账期 + 可选的待支付账期
    const statusFilter = includePending ? ["overdue", "pending"] : ["overdue"]

    let query = supabaseClient
      .from("rental_billing_cycles")
      .select(`
        id,
        rental_order_id,
        due_date,
        amount_due,
        amount_paid,
        status,
        rental_orders!inner(
          id,
          restaurant_id,
          provider_id
        )
      `, { count: "exact" })
      .in("status", statusFilter)

    // 餐厅筛选
    if (restaurantId) {
      query = query.eq("rental_orders.restaurant_id", restaurantId)
    }

    // 多租户隔离：按供应商过滤
    if (currentCompanyId) {
      query = query.eq("rental_orders.provider_id", currentCompanyId)
    }

    // 如果包含待支付，还需要筛选 due_date < 今天的待支付账期
    if (includePending) {
      const today = new Date().toISOString().split("T")[0]
      query = query.or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${today})`)
    }

    const { data: billingCycles, error: queryError, count } = await query

    if (queryError) {
      console.error("[欠款统计] 查询失败:", queryError)
      return NextResponse.json(
        {
          success: false,
          error: "查询欠款数据失败",
          details: queryError.message,
        },
        { status: 500 }
      )
    }

    // 计算统计数据
    const today = new Date()
    const cycles = billingCycles || []
    
    let totalAmountDue = 0
    let totalAmountPaid = 0
    let totalAmountOverdue = 0
    let overdueCount = 0
    let pendingCount = 0
    let maxOverdueDays = 0

    const restaurantStats: Record<string, {
      restaurant_id: string
      total_overdue: number
      cycle_count: number
    }> = {}

    cycles.forEach((cycle: any) => {
      const amountDue = parseFloat(cycle.amount_due?.toString() || "0")
      const amountPaid = parseFloat(cycle.amount_paid?.toString() || "0")
      const amountOverdue = amountDue - amountPaid

      totalAmountDue += amountDue
      totalAmountPaid += amountPaid
      totalAmountOverdue += amountOverdue

      if (cycle.status === "overdue") {
        overdueCount++
        const dueDate = new Date(cycle.due_date)
        const overdueDays = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (overdueDays > maxOverdueDays) {
          maxOverdueDays = overdueDays
        }
      } else if (cycle.status === "pending") {
        pendingCount++
      }

      // 按餐厅统计
      const restId = cycle.rental_orders?.restaurant_id
      if (restId) {
        if (!restaurantStats[restId]) {
          restaurantStats[restId] = {
            restaurant_id: restId,
            total_overdue: 0,
            cycle_count: 0,
          }
        }
        restaurantStats[restId].total_overdue += amountOverdue
        restaurantStats[restId].cycle_count++
      }
    })

    // 计算平均逾期天数
    const overdueCycles = cycles.filter((c: any) => c.status === "overdue")
    const avgOverdueDays = overdueCycles.length > 0
      ? Math.round(
          overdueCycles.reduce((sum: number, cycle: any) => {
            const dueDate = new Date(cycle.due_date)
            const overdueDays = Math.floor(
              (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            )
            return sum + overdueDays
          }, 0) / overdueCycles.length
        )
      : 0

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_cycles: count || 0,
          overdue_count: overdueCount,
          pending_count: pendingCount,
          total_amount_due: totalAmountDue,
          total_amount_paid: totalAmountPaid,
          total_amount_overdue: totalAmountOverdue,
          max_overdue_days: maxOverdueDays,
          avg_overdue_days: avgOverdueDays,
        },
        by_restaurant: Object.values(restaurantStats).sort(
          (a, b) => b.total_overdue - a.total_overdue
        ),
      },
    })
  } catch (err: any) {
    console.error("[欠款统计] 错误:", err)
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
