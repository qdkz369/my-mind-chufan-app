// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：财务报表生成

import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 生成财务报表
 * 查询参数：
 * - report_type: 报表类型（必需）：'revenue'（收入统计）、'billing'（账期分析）、'overdue'（逾期统计）
 * - start_date: 开始日期（格式：YYYY-MM-DD）（可选，默认：30天前）
 * - end_date: 结束日期（格式：YYYY-MM-DD）（可选，默认：今天）
 * - provider_id: 供应商ID（可选）
 * - restaurant_id: 餐厅ID（可选）
 * - format: 导出格式（可选）：'json'（默认）、'excel'（Excel）、'pdf'（PDF）
 */
export async function GET(request: NextRequest) {
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
        console.log("[财务报表API] Super Admin 访问，跳过多租户过滤")
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
    const reportType = requestUrl.searchParams.get("report_type")
    const startDateParam = requestUrl.searchParams.get("start_date")
    const endDateParam = requestUrl.searchParams.get("end_date")
    const providerId = requestUrl.searchParams.get("provider_id")
    const restaurantId = requestUrl.searchParams.get("restaurant_id")
    const format = requestUrl.searchParams.get("format") || "json"

    // 验证报表类型
    if (!reportType || !['revenue', 'billing', 'overdue'].includes(reportType)) {
      return NextResponse.json(
        {
          success: false,
          error: "报表类型无效",
          details: "report_type 必须是 'revenue'、'billing' 或 'overdue'",
        },
        { status: 400 }
      )
    }

    // 默认时间范围：30天前到今天
    const endDate = endDateParam || new Date().toISOString().split("T")[0]
    const startDate = startDateParam || (() => {
      const date = new Date()
      date.setDate(date.getDate() - 30)
      return date.toISOString().split("T")[0]
    })()

    // 🔒 统一 company_id 来源：使用 getUserContext
    const currentCompanyId = userContext?.companyId
    const finalProviderId = providerId || (userContext?.role !== "super_admin" ? currentCompanyId : undefined)

    // 构建基础查询
    let orderQuery = supabaseClient
      .from("rental_orders")
      .select(`
        id,
        order_number,
        restaurant_id,
        equipment_id,
        provider_id,
        order_status,
        payment_status,
        total_amount,
        deposit_amount,
        monthly_rental_price,
        rental_period,
        start_date,
        end_date,
        created_at
      `)

    // 时间范围筛选
    orderQuery = orderQuery.gte("created_at", `${startDate}T00:00:00Z`)
    orderQuery = orderQuery.lte("created_at", `${endDate}T23:59:59Z`)

    // 供应商筛选（super_admin 跳过）
    if (finalProviderId && userContext?.role !== "super_admin") {
      orderQuery = orderQuery.eq("provider_id", finalProviderId)
    } else if (userContext?.role === "super_admin") {
      console.log("[财务报表API] Super Admin 访问，不应用供应商筛选")
    }

    // 餐厅筛选
    if (restaurantId) {
      orderQuery = orderQuery.eq("restaurant_id", restaurantId)
    }

    const { data: orders, error: ordersError } = await orderQuery

    if (ordersError) {
      console.error("[财务报表] 查询订单失败:", ordersError)
      return NextResponse.json(
        {
          success: false,
          error: "查询订单失败",
          details: ordersError.message,
        },
        { status: 500 }
      )
    }

    const ordersList = orders || []
    const orderIds = ordersList.map((order: any) => order.id)

    // 查询账期数据
    let billingCycles: any[] = []
    if (orderIds.length > 0) {
      const { data: cycles, error: cyclesError } = await supabaseClient
        .from("rental_billing_cycles")
        .select("*")
        .in("rental_order_id", orderIds)

      if (!cyclesError && cycles) {
        billingCycles = cycles
      }
    }

    // 根据报表类型生成不同的报表数据
    let reportData: any = {}

    if (reportType === "revenue") {
      // 收入统计报表
      reportData = generateRevenueReport(ordersList, billingCycles)
    } else if (reportType === "billing") {
      // 账期分析报表
      reportData = generateBillingReport(ordersList, billingCycles)
    } else if (reportType === "overdue") {
      // 逾期统计报表
      reportData = generateOverdueReport(ordersList, billingCycles)
    }

    // 如果请求格式为 JSON，直接返回
    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: {
          report_type: reportType,
          period: {
            start_date: startDate,
            end_date: endDate,
          },
          generated_at: new Date().toISOString(),
          ...reportData,
        },
      })
    }

    // 其他格式（Excel/PDF）暂未实现，返回提示
    return NextResponse.json(
      {
        success: false,
        error: "导出格式暂未实现",
        details: `格式 '${format}' 暂未实现，目前仅支持 'json' 格式`,
        note: "请使用 format=json 获取报表数据，前端可自行实现 Excel/PDF 导出",
      },
      { status: 501 }
    )
  } catch (err: any) {
    console.error("[财务报表] 错误:", err)
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
 * 生成收入统计报表
 */
function generateRevenueReport(orders: any[], billingCycles: any[]) {
  const today = new Date()
  
  // 按日期统计收入
  const dailyRevenue: Record<string, {
    date: string
    orders_count: number
    total_amount: number
    deposit_received: number
    deposit_refunded: number
    billing_paid: number
  }> = {}

  orders.forEach((order: any) => {
    const orderDate = order.created_at.split("T")[0]
    if (!dailyRevenue[orderDate]) {
      dailyRevenue[orderDate] = {
        date: orderDate,
        orders_count: 0,
        total_amount: 0,
        deposit_received: 0,
        deposit_refunded: 0,
        billing_paid: 0,
      }
    }

    dailyRevenue[orderDate].orders_count++
    dailyRevenue[orderDate].total_amount += parseFloat(order.total_amount?.toString() || "0")
    
    const depositAmount = parseFloat(order.deposit_amount?.toString() || "0")
    dailyRevenue[orderDate].deposit_received += depositAmount
    
    if (order.payment_status === "refunded") {
      dailyRevenue[orderDate].deposit_refunded += depositAmount
    }
  })

  // 统计账期支付
  billingCycles.forEach((cycle: any) => {
    if (cycle.paid_at) {
      const paidDate = cycle.paid_at.split("T")[0]
      if (!dailyRevenue[paidDate]) {
        dailyRevenue[paidDate] = {
          date: paidDate,
          orders_count: 0,
          total_amount: 0,
          deposit_received: 0,
          deposit_refunded: 0,
          billing_paid: 0,
        }
      }
      dailyRevenue[paidDate].billing_paid += parseFloat(cycle.amount_paid?.toString() || "0")
    }
  })

  // 计算汇总
  const totalRevenue = Object.values(dailyRevenue).reduce(
    (sum, day) => sum + day.total_amount + day.billing_paid,
    0
  )
  const totalDepositReceived = Object.values(dailyRevenue).reduce(
    (sum, day) => sum + day.deposit_received,
    0
  )
  const totalDepositRefunded = Object.values(dailyRevenue).reduce(
    (sum, day) => sum + day.deposit_refunded,
    0
  )
  const totalBillingPaid = Object.values(dailyRevenue).reduce(
    (sum, day) => sum + day.billing_paid,
    0
  )

  return {
    summary: {
      total_revenue: totalRevenue,
      total_deposit_received: totalDepositReceived,
      total_deposit_refunded: totalDepositRefunded,
      net_deposit: totalDepositReceived - totalDepositRefunded,
      total_billing_paid: totalBillingPaid,
      total_orders: orders.length,
    },
    daily_revenue: Object.values(dailyRevenue).sort((a, b) => 
      a.date.localeCompare(b.date)
    ),
  }
}

/**
 * 生成账期分析报表
 */
function generateBillingReport(orders: any[], billingCycles: any[]) {
  // 按状态统计账期
  const cyclesByStatus: Record<string, {
    status: string
    count: number
    total_amount_due: number
    total_amount_paid: number
  }> = {}

  billingCycles.forEach((cycle: any) => {
    const status = cycle.status || "unknown"
    if (!cyclesByStatus[status]) {
      cyclesByStatus[status] = {
        status,
        count: 0,
        total_amount_due: 0,
        total_amount_paid: 0,
      }
    }

    cyclesByStatus[status].count++
    cyclesByStatus[status].total_amount_due += parseFloat(cycle.amount_due?.toString() || "0")
    cyclesByStatus[status].total_amount_paid += parseFloat(cycle.amount_paid?.toString() || "0")
  })

  // 按月份统计账期
  const cyclesByMonth: Record<string, {
    month: string
    count: number
    total_amount_due: number
    total_amount_paid: number
  }> = {}

  billingCycles.forEach((cycle: any) => {
    const month = cycle.cycle_month || "unknown"
    if (!cyclesByMonth[month]) {
      cyclesByMonth[month] = {
        month,
        count: 0,
        total_amount_due: 0,
        total_amount_paid: 0,
      }
    }

    cyclesByMonth[month].count++
    cyclesByMonth[month].total_amount_due += parseFloat(cycle.amount_due?.toString() || "0")
    cyclesByMonth[month].total_amount_paid += parseFloat(cycle.amount_paid?.toString() || "0")
  })

  return {
    summary: {
      total_cycles: billingCycles.length,
      by_status: cyclesByStatus,
      total_amount_due: Object.values(cyclesByStatus).reduce(
        (sum, stat) => sum + stat.total_amount_due,
        0
      ),
      total_amount_paid: Object.values(cyclesByStatus).reduce(
        (sum, stat) => sum + stat.total_amount_paid,
        0
      ),
    },
    by_month: Object.values(cyclesByMonth).sort((a, b) => 
      a.month.localeCompare(b.month)
    ),
  }
}

/**
 * 生成逾期统计报表
 */
function generateOverdueReport(orders: any[], billingCycles: any[]) {
  const today = new Date()

  // 筛选逾期账期
  const overdueCycles = billingCycles.filter((cycle: any) => {
    if (cycle.status === "overdue") return true
    
    // 如果状态不是 overdue，但 due_date < 今天，也算逾期
    if (cycle.due_date) {
      const dueDate = new Date(cycle.due_date)
      return dueDate < today && cycle.status !== "paid"
    }
    
    return false
  })

  // 按逾期天数分组
  const overdueByDays: Record<string, {
    days_range: string
    count: number
    total_amount: number
  }> = {
    "1-7": { days_range: "1-7天", count: 0, total_amount: 0 },
    "8-30": { days_range: "8-30天", count: 0, total_amount: 0 },
    "31-60": { days_range: "31-60天", count: 0, total_amount: 0 },
    "60+": { days_range: "60天以上", count: 0, total_amount: 0 },
  }

  overdueCycles.forEach((cycle: any) => {
    if (!cycle.due_date) return

    const dueDate = new Date(cycle.due_date)
    const overdueDays = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    const amountOverdue = parseFloat(cycle.amount_due?.toString() || "0") - 
                         parseFloat(cycle.amount_paid?.toString() || "0")

    let daysRange = "60+"
    if (overdueDays <= 7) {
      daysRange = "1-7"
    } else if (overdueDays <= 30) {
      daysRange = "8-30"
    } else if (overdueDays <= 60) {
      daysRange = "31-60"
    }

    overdueByDays[daysRange].count++
    overdueByDays[daysRange].total_amount += amountOverdue
  })

  // 按餐厅统计逾期
  const overdueByRestaurant: Record<string, {
    restaurant_id: string
    count: number
    total_amount: number
  }> = {}

  overdueCycles.forEach((cycle: any) => {
    const order = orders.find((o: any) => o.id === cycle.rental_order_id)
    if (!order) return

    const restId = order.restaurant_id || "unknown"
    if (!overdueByRestaurant[restId]) {
      overdueByRestaurant[restId] = {
        restaurant_id: restId,
        count: 0,
        total_amount: 0,
      }
    }

    const amountOverdue = parseFloat(cycle.amount_due?.toString() || "0") - 
                         parseFloat(cycle.amount_paid?.toString() || "0")

    overdueByRestaurant[restId].count++
    overdueByRestaurant[restId].total_amount += amountOverdue
  })

  return {
    summary: {
      total_overdue_cycles: overdueCycles.length,
      total_overdue_amount: Object.values(overdueByDays).reduce(
        (sum, range) => sum + range.total_amount,
        0
      ),
      by_days_range: overdueByDays,
      by_restaurant: Object.values(overdueByRestaurant).sort(
        (a, b) => b.total_amount - a.total_amount
      ),
    },
    overdue_cycles: overdueCycles.map((cycle: any) => {
      const order = orders.find((o: any) => o.id === cycle.rental_order_id)
      const dueDate = new Date(cycle.due_date)
      const overdueDays = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: cycle.id,
        rental_order_id: cycle.rental_order_id,
        order_number: order?.order_number,
        restaurant_id: order?.restaurant_id,
        cycle_month: cycle.cycle_month,
        due_date: cycle.due_date,
        amount_due: parseFloat(cycle.amount_due?.toString() || "0"),
        amount_paid: parseFloat(cycle.amount_paid?.toString() || "0"),
        amount_overdue: parseFloat(cycle.amount_due?.toString() || "0") - 
                       parseFloat(cycle.amount_paid?.toString() || "0"),
        overdue_days: overdueDays,
      }
    }),
  }
}
