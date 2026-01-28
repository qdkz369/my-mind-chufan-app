// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：查询逾期账期列表

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 查询逾期账期列表
 * 查询参数：
 * - restaurant_id: 餐厅ID（可选）
 * - days: 最小逾期天数（可选，例如：30 表示查询逾期30天以上的账期）
 * - status: 账期状态（可选，默认：'overdue'）
 * - page: 页码（可选，默认：1）
 * - page_size: 每页数量（可选，默认：20）
 */
export async function GET(request: Request) {
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
        console.log("[逾期账期API] Super Admin 访问，跳过多租户过滤")
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

    const requestUrl = new URL(request.url)
    const restaurantId = requestUrl.searchParams.get("restaurant_id")
    const daysParam = requestUrl.searchParams.get("days")
    const statusParam = requestUrl.searchParams.get("status") || "overdue"
    const page = parseInt(requestUrl.searchParams.get("page") || "1")
    const pageSize = parseInt(requestUrl.searchParams.get("page_size") || "20")

    // P0修复：统一 company_id 来源：使用 getUserContext
    const currentCompanyId = userContext.companyId

    // 构建查询
    let query = supabaseClient
      .from("rental_billing_cycles")
      .select(`
        id,
        rental_order_id,
        cycle_number,
        cycle_month,
        due_date,
        amount_due,
        amount_paid,
        status,
        rental_orders!inner(
          id,
          order_number,
          restaurant_id,
          equipment_id,
          provider_id
        )
      `, { count: "exact" })

    // 状态筛选
    query = query.eq("status", statusParam)

    // 餐厅筛选
    if (restaurantId) {
      query = query.eq("rental_orders.restaurant_id", restaurantId)
    }

    // 多租户隔离：按供应商过滤（super_admin 跳过）
    if (currentCompanyId && userContext?.role !== "super_admin") {
      query = query.eq("rental_orders.provider_id", currentCompanyId)
    } else if (userContext?.role === "super_admin") {
      console.log("[逾期账期API] Super Admin 访问，不应用供应商筛选")
    }

    // 逾期天数筛选（如果提供了最小逾期天数）
    if (daysParam) {
      const minDays = parseInt(daysParam)
      if (!isNaN(minDays) && minDays > 0) {
        const minDueDate = new Date()
        minDueDate.setDate(minDueDate.getDate() - minDays)
        const minDueDateStr = minDueDate.toISOString().split("T")[0]
        query = query.lt("due_date", minDueDateStr)
      }
    }

    // 排序：按逾期天数降序（最久的在前）
    query = query.order("due_date", { ascending: true })

    // 分页
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: billingCycles, error: queryError, count } = await query

    if (queryError) {
      console.error("[逾期账期查询] 查询失败:", queryError)
      return NextResponse.json(
        {
          success: false,
          error: "查询逾期账期失败",
          details: queryError.message,
        },
        { status: 500 }
      )
    }

    // 计算逾期天数和逾期金额
    const overdueCycles = (billingCycles || []).map((cycle: any) => {
      const dueDate = new Date(cycle.due_date)
      const today = new Date()
      const overdueDays = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const amountDue = parseFloat(cycle.amount_due?.toString() || "0")
      const amountPaid = parseFloat(cycle.amount_paid?.toString() || "0")
      const amountOverdue = amountDue - amountPaid

      return {
        id: cycle.id,
        rental_order_id: cycle.rental_order_id,
        order_number: cycle.rental_orders?.order_number,
        restaurant_id: cycle.rental_orders?.restaurant_id,
        equipment_id: cycle.rental_orders?.equipment_id,
        cycle_number: cycle.cycle_number,
        cycle_month: cycle.cycle_month,
        due_date: cycle.due_date,
        amount_due: amountDue,
        amount_paid: amountPaid,
        amount_overdue: amountOverdue,
        status: cycle.status,
        overdue_days: overdueDays,
      }
    })

    // 计算总逾期金额
    const totalOverdueAmount = overdueCycles.reduce(
      (sum, cycle) => sum + cycle.amount_overdue,
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        overdue_cycles: overdueCycles,
        pagination: {
          page,
          page_size: pageSize,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / pageSize),
        },
        summary: {
          total_count: count || 0,
          total_overdue_amount: totalOverdueAmount,
          avg_overdue_days: overdueCycles.length > 0
            ? Math.round(
                overdueCycles.reduce((sum, cycle) => sum + cycle.overdue_days, 0) / overdueCycles.length
              )
            : 0,
        },
      },
    })
  } catch (err: any) {
    console.error("[逾期账期查询] 错误:", err)
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
