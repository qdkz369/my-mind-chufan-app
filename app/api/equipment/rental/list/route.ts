import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

/**
 * GET: 获取租赁订单列表
 * 查询参数：
 * - restaurant_id: 餐厅ID（必需）
 * - user_id: 用户ID（可选，用于RLS）
 * - status: 订单状态筛选（可选）
 */
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get("restaurant_id")
    const userId = searchParams.get("user_id")
    const status = searchParams.get("status")

    if (!restaurantId) {
      return NextResponse.json(
        { error: "缺少 restaurant_id 参数" },
        { status: 400 }
      )
    }

    let query = supabase
      .from("rental_orders")
      .select(`
        *,
        equipment (
          id,
          name,
          brand,
          model,
          images,
          equipment_categories (
            id,
            name,
            icon
          )
        )
      `)
      .eq("restaurant_id", restaurantId)

    // 用户ID筛选（如果提供）
    if (userId) {
      query = query.eq("user_id", userId)
    }

    // 状态筛选
    if (status) {
      query = query.eq("order_status", status)
    }

    query = query.order("created_at", { ascending: false })

    const { data: orders, error } = await query

    if (error) {
      console.error("[租赁订单列表API] 查询失败:", error)
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
    console.error("[租赁订单列表API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

