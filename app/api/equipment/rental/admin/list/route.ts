import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * GET: 获取所有设备租赁订单（管理端）
 * 查询参数：
 * - status: 订单状态筛选（可选）
 * - restaurant_id: 餐厅ID筛选（可选）
 */
export async function GET(request: Request) {
  try {
    // 使用 service role key 绕过 RLS，允许管理员查看所有订单
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gjlhcpfvjgqabqanvgmu.supabase.co"
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!serviceRoleKey) {
      console.error("[设备租赁管理API] SUPABASE_SERVICE_ROLE_KEY 未配置")
      return NextResponse.json(
        { error: "服务器配置错误", details: "SUPABASE_SERVICE_ROLE_KEY 未配置" },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const restaurantId = searchParams.get("restaurant_id")

    let query = supabaseClient
      .from("rental_orders")
      .select(`
        *,
        equipment (
          id,
          name,
          brand,
          model,
          images,
          monthly_rental_price,
          deposit_amount,
          equipment_categories (
            id,
            name,
            icon
          )
        ),
        restaurants (
          id,
          name,
          contact_name,
          contact_phone
        )
      `)

    // 状态筛选
    if (status && status !== "all") {
      query = query.eq("order_status", status)
    }

    // 餐厅ID筛选
    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId)
    }

    query = query.order("created_at", { ascending: false })

    const { data: orders, error } = await query

    if (error) {
      console.error("[设备租赁管理API] 查询失败:", error)
      return NextResponse.json(
        { error: "获取租赁订单列表失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
    })
  } catch (err: any) {
    console.error("[设备租赁管理API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

