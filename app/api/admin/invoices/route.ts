// 管理端发票列表 API
// 认证：getUserContext（平台用户）

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取发票申请列表（管理端）
 * 查询参数：status, page, page_size, restaurant_id
 */
export async function GET(request: NextRequest) {
  try {
    const userContext = await getUserContext(request)
    if (!userContext) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !key) {
      return NextResponse.json(
        { success: false, error: "服务器配置错误" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const restaurantId = searchParams.get("restaurant_id")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = Math.min(parseInt(searchParams.get("page_size") || "20"), 100)

    // 多租户：非 super_admin 按 company_id 过滤
    let restaurantIds: string[] | null = null
    if (userContext.role !== "super_admin" && userContext.companyId) {
      const { data: companyRestaurants } = await supabase
        .from("restaurants")
        .select("id")
        .eq("company_id", userContext.companyId)
      restaurantIds = (companyRestaurants || []).map((r: any) => r.id)
      if (restaurantIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page: 1, page_size: pageSize, total: 0, total_pages: 0 },
        })
      }
    }

    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }
    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId)
    }
    if (restaurantIds !== null) {
      query = query.in("restaurant_id", restaurantIds)
    }

    const { data: invoiceList, error, count } = await query.range(
      (page - 1) * pageSize,
      page * pageSize - 1
    )

    if (error) {
      console.error("[管理端发票API] 查询失败:", error)
      return NextResponse.json(
        { success: false, error: "查询失败", details: error.message },
        { status: 500 }
      )
    }

    const orderMainIds = [...new Set((invoiceList || []).map((i: any) => i.order_main_id).filter(Boolean))]
    const restaurantIdsFromInvoices = [...new Set((invoiceList || []).map((i: any) => i.restaurant_id).filter(Boolean))]

    let orderMap: Record<string, any> = {}
    let restaurantMap: Record<string, any> = {}

    if (orderMainIds.length > 0) {
      const { data: orders } = await supabase
        .from("order_main")
        .select("id, order_number, order_type, total_amount, created_at")
        .in("id", orderMainIds)
      if (orders) {
        orderMap = orders.reduce((acc: Record<string, any>, o: any) => {
          acc[o.id] = o
          return acc
        }, {})
      }
    }
    if (restaurantIdsFromInvoices.length > 0) {
      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("id, name, contact_name, contact_phone")
        .in("id", restaurantIdsFromInvoices)
      if (restaurants) {
        restaurantMap = restaurants.reduce((acc: Record<string, any>, r: any) => {
          acc[r.id] = r
          return acc
        }, {})
      }
    }

    const invoices = (invoiceList || []).map((inv: any) => {
      const om = orderMap[inv.order_main_id]
      const rest = restaurantMap[inv.restaurant_id]
      return {
        id: inv.id,
        order_main_id: inv.order_main_id,
        restaurant_id: inv.restaurant_id,
        order_number: om?.order_number,
        order_type: om?.order_type,
        amount: inv.amount,
        invoice_type: inv.invoice_type,
        title_type: inv.title_type,
        company_name: inv.company_name,
        tax_id: inv.tax_id,
        address: inv.address,
        phone: inv.phone,
        bank_name: inv.bank_name,
        bank_account: inv.bank_account,
        email: inv.email,
        status: inv.status,
        invoice_number: inv.invoice_number,
        issued_at: inv.issued_at,
        created_at: inv.created_at,
        restaurant: rest ? { id: rest.id, name: rest.name, contact_name: rest.contact_name } : null,
      }
    })

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    })
  } catch (err: any) {
    console.error("[管理端发票API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
