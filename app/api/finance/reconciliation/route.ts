// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：财务对账功能

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentCompanyId } from "@/lib/multi-tenant"

/**
 * GET: 财务对账
 * 查询参数：
 * - start_date: 开始日期（格式：YYYY-MM-DD）（可选，默认：30天前）
 * - end_date: 结束日期（格式：YYYY-MM-DD）（可选，默认：今天）
 * - provider_id: 供应商ID（可选）
 * - restaurant_id: 餐厅ID（可选）
 * - order_status: 订单状态（可选）
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
    const startDateParam = requestUrl.searchParams.get("start_date")
    const endDateParam = requestUrl.searchParams.get("end_date")
    const providerId = requestUrl.searchParams.get("provider_id")
    const restaurantId = requestUrl.searchParams.get("restaurant_id")
    const orderStatus = requestUrl.searchParams.get("order_status")

    // 默认时间范围：30天前到今天
    const endDate = endDateParam || new Date().toISOString().split("T")[0]
    const startDate = startDateParam || (() => {
      const date = new Date()
      date.setDate(date.getDate() - 30)
      return date.toISOString().split("T")[0]
    })()

    // 多租户隔离：获取当前用户的 company_id
    const currentCompanyId = await getCurrentCompanyId(request)
    const finalProviderId = providerId || currentCompanyId

    // 构建订单查询
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

    // 供应商筛选
    if (finalProviderId) {
      orderQuery = orderQuery.eq("provider_id", finalProviderId)
    }

    // 餐厅筛选
    if (restaurantId) {
      orderQuery = orderQuery.eq("restaurant_id", restaurantId)
    }

    // 订单状态筛选
    if (orderStatus) {
      orderQuery = orderQuery.eq("order_status", orderStatus)
    }

    const { data: orders, error: ordersError } = await orderQuery

    if (ordersError) {
      console.error("[财务对账] 查询订单失败:", ordersError)
      return NextResponse.json(
        {
          success: false,
          error: "查询订单失败",
          details: ordersError.message,
        },
        { status: 500 }
      )
    }

    // 查询账期信息
    const orderIds = orders?.map((order: any) => order.id) || []
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

    // 计算统计数据
    const ordersList = orders || []
    
    // 订单统计
    const ordersByStatus: Record<string, number> = {}
    let totalOrdersAmount = 0
    let totalDepositAmount = 0
    let totalRefundedAmount = 0

    ordersList.forEach((order: any) => {
      const status = order.order_status || "unknown"
      ordersByStatus[status] = (ordersByStatus[status] || 0) + 1
      totalOrdersAmount += parseFloat(order.total_amount?.toString() || "0")
      totalDepositAmount += parseFloat(order.deposit_amount?.toString() || "0")
      
      if (order.payment_status === "refunded") {
        totalRefundedAmount += parseFloat(order.deposit_amount?.toString() || "0")
      }
    })

    // 账期统计
    const cyclesByStatus: Record<string, number> = {}
    let totalAmountDue = 0
    let totalAmountPaid = 0
    let totalAmountOverdue = 0

    billingCycles.forEach((cycle: any) => {
      const status = cycle.status || "unknown"
      cyclesByStatus[status] = (cyclesByStatus[status] || 0) + 1
      
      const amountDue = parseFloat(cycle.amount_due?.toString() || "0")
      const amountPaid = parseFloat(cycle.amount_paid?.toString() || "0")
      
      totalAmountDue += amountDue
      totalAmountPaid += amountPaid
      
      if (status === "overdue") {
        totalAmountOverdue += (amountDue - amountPaid)
      }
    })

    // 按订单汇总
    const ordersSummary = ordersList.map((order: any) => {
      const orderCycles = billingCycles.filter((cycle: any) => cycle.rental_order_id === order.id)
      const orderAmountDue = orderCycles.reduce((sum, cycle) => 
        sum + parseFloat(cycle.amount_due?.toString() || "0"), 0
      )
      const orderAmountPaid = orderCycles.reduce((sum, cycle) => 
        sum + parseFloat(cycle.amount_paid?.toString() || "0"), 0
      )
      const orderAmountOverdue = orderCycles
        .filter((cycle: any) => cycle.status === "overdue")
        .reduce((sum, cycle) => 
          sum + (parseFloat(cycle.amount_due?.toString() || "0") - parseFloat(cycle.amount_paid?.toString() || "0")), 0
        )

      return {
        order_id: order.id,
        order_number: order.order_number,
        restaurant_id: order.restaurant_id,
        order_status: order.order_status,
        payment_status: order.payment_status,
        total_amount: parseFloat(order.total_amount?.toString() || "0"),
        deposit_amount: parseFloat(order.deposit_amount?.toString() || "0"),
        billing_cycles_count: orderCycles.length,
        amount_due: orderAmountDue,
        amount_paid: orderAmountPaid,
        amount_overdue: orderAmountOverdue,
        created_at: order.created_at,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        summary: {
          // 订单统计
          orders: {
            total_count: ordersList.length,
            by_status: ordersByStatus,
            total_amount: totalOrdersAmount,
            total_deposit: totalDepositAmount,
            total_refunded: totalRefundedAmount,
          },
          // 账期统计
          billing_cycles: {
            total_count: billingCycles.length,
            by_status: cyclesByStatus,
            total_amount_due: totalAmountDue,
            total_amount_paid: totalAmountPaid,
            total_amount_overdue: totalAmountOverdue,
          },
          // 应收应付汇总
          receivable: {
            total: totalAmountDue - totalAmountPaid, // 总应收
            overdue: totalAmountOverdue, // 逾期应收
            normal: (totalAmountDue - totalAmountPaid) - totalAmountOverdue, // 正常应收
          },
          // 已收汇总
          received: {
            total: totalAmountPaid, // 总已收
            deposit: totalDepositAmount - totalRefundedAmount, // 押金净收入
          },
        },
        // 订单明细
        orders: ordersSummary,
      },
    })
  } catch (err: any) {
    console.error("[财务对账] 错误:", err)
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
