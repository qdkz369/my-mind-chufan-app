import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// 后备值（与 lib/supabase.ts 保持一致）
const FALLBACK_SUPABASE_URL = "https://gjlhcpfvjgqabqanvgmu.supabase.co"
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_OQSB-t8qr1xO0WRcpVSIZA_O4RFkAHQ"

/**
 * GET: 获取租赁订单列表
 * 查询参数：
 * - restaurant_id: 餐厅ID（必需）
 * - user_id: 用户ID（可选，用于RLS）
 * - status: 订单状态筛选（可选）
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY
    
    // 优先使用 service role key，如果没有则使用 anon key（需要 RLS 策略允许）
    const keyToUse = serviceRoleKey || anonKey
    
    if (!keyToUse) {
      console.error("[租赁订单列表API] 未找到有效的 Supabase 密钥")
      return NextResponse.json(
        { 
          success: true, 
          data: [],
          warning: "未配置 Supabase 密钥，返回空列表"
        },
        { status: 200 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get("restaurant_id")
    const userId = searchParams.get("user_id")
    const status = searchParams.get("status")

    if (!restaurantId) {
      return NextResponse.json(
        { 
          success: true,
          data: [],
          error: "缺少 restaurant_id 参数" 
        },
        { status: 200 } // 返回 200 避免前端崩溃
      )
    }

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
      // 如果是表不存在的错误，返回空数组而不是错误
      if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
        console.warn("[租赁订单列表API] 表不存在，返回空列表:", error.message)
        return NextResponse.json({
          success: true,
          data: [],
          warning: "租赁订单表不存在，请先运行数据库迁移脚本"
        })
      }
      
      console.error("[租赁订单列表API] 查询失败:", error)
      // 即使查询失败，也返回空数组，避免前端崩溃
      return NextResponse.json({
        success: true,
        data: [],
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
    })
  } catch (err: any) {
    console.error("[租赁订单列表API] 错误:", err)
    // 捕获所有错误，返回空数组而不是错误，确保前端不会崩溃
    return NextResponse.json({
      success: true,
      data: [],
      error: err.message
    })
  }
}


