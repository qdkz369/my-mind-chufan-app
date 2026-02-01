// 获取可申请发票的订单列表
// 认证：x-restaurant-id（客户端用户）或 getUserContext（平台用户）

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取已完成且未开票的订单列表
 */
export async function GET(request: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(request)
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    const supabase = createSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "服务器配置错误" },
        { status: 500 }
      )
    }

    // 查询已完成的订单（completed 或 paid）
    const { data: orders, error: ordersError } = await supabase
      .from("order_main")
      .select("id, order_number, order_type, total_amount, status, created_at, fuel_order_id")
      .eq("restaurant_id", restaurantId)
      .in("status", ["completed", "paid"])
      .order("created_at", { ascending: false })
      .limit(100)

    if (ordersError) {
      console.error("[可开票订单API] 查询失败:", ordersError)
      return NextResponse.json(
        { success: false, error: "查询失败", details: ordersError.message },
        { status: 500 }
      )
    }

    const orderIds = (orders || []).map((o: any) => o.id)
    if (orderIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // 排除已开过票的订单
    const { data: invoicedOrders } = await supabase
      .from("invoices")
      .select("order_main_id")
      .in("order_main_id", orderIds)

    const invoicedSet = new Set((invoicedOrders || []).map((i: any) => i.order_main_id))
    const eligibleOrders = (orders || []).filter((o: any) => !invoicedSet.has(o.id))

    // 燃料订单：从 delivery_orders 获取 payment_method、corporate_company_name、corporate_tax_id
    const fuelOrderIds = eligibleOrders
      .filter((o: any) => o.order_type === "fuel" && o.fuel_order_id)
      .map((o: any) => o.fuel_order_id)
    let deliveryMap: Record<string, { payment_method?: string; corporate_company_name?: string; corporate_tax_id?: string }> = {}
    if (fuelOrderIds.length > 0) {
      const { data: deliveries } = await supabase
        .from("delivery_orders")
        .select("id, payment_method, corporate_company_name, corporate_tax_id")
        .in("id", fuelOrderIds)
      if (deliveries) {
        deliveryMap = deliveries.reduce((acc: any, d: any) => {
          acc[d.id] = {
            payment_method: d.payment_method,
            corporate_company_name: d.corporate_company_name,
            corporate_tax_id: d.corporate_tax_id,
          }
          return acc
        }, {})
      }
    }

    const eligible = eligibleOrders.map((o: any) => {
      const base = {
        id: o.id,
        order_number: o.order_number,
        order_type: o.order_type,
        total_amount: o.total_amount,
        status: o.status,
        created_at: o.created_at,
      }
      if (o.order_type === "fuel" && o.fuel_order_id && deliveryMap[o.fuel_order_id]) {
        const d = deliveryMap[o.fuel_order_id]
        return {
          ...base,
          payment_method: d.payment_method,
          corporate_company_name: d.corporate_company_name,
          corporate_tax_id: d.corporate_tax_id,
        }
      }
      return base
    })

    return NextResponse.json({
      success: true,
      data: eligible,
    })
  } catch (err: any) {
    console.error("[可开票订单API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

async function resolveRestaurantId(request: NextRequest): Promise<string | null> {
  const clientRestaurantId = request.headers.get("x-restaurant-id")?.trim()
  if (clientRestaurantId) return clientRestaurantId

  const userContext = await getUserContext(request)
  if (!userContext) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !key) return null

  const supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("user_id", userContext.userId)
    .limit(1)
    .maybeSingle()

  return data?.id || null
}

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !key) return null
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
