import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// 从 lib/supabase.ts 获取后备值
const FALLBACK_SUPABASE_URL = "https://gjlhcpfvjgqabqanvgmu.supabase.co"
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_OQSB-t8qr1xO0WRcpVSIZA_O4RFkAHQ"

/**
 * GET: 获取所有设备租赁订单（管理端）
 * 查询参数：
 * - status: 订单状态筛选（可选）
 * - restaurant_id: 餐厅ID筛选（可选）
 * 
 * 注意：此 API 查询的是 rental_orders 表（设备租赁订单表）
 * 如果查询 rentals 表（租赁管理表），请使用不同的 API 端点
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY

    let supabaseClient: any

    if (serviceRoleKey) {
      // 优先使用 service role key 绕过 RLS
      supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      console.log("[设备租赁管理API] 使用服务角色密钥")
    } else if (anonKey) {
      // 降级使用 anon key
      supabaseClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      console.warn("[设备租赁管理API] SUPABASE_SERVICE_ROLE_KEY 未配置，降级使用匿名密钥")
    } else {
      console.error("[设备租赁管理API] 错误: 缺少 Supabase 配置 (服务角色密钥和匿名密钥均未配置)")
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置。请检查环境变量。",
          data: [],
        },
        { status: 200 } // 返回 200 避免前端崩溃，但指示失败
      )
    }

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
        {
          success: false,
          error: "获取租赁订单列表失败",
          details: error.message,
          data: [],
        },
        { status: 200 } // 返回 200 避免前端崩溃，但指示失败
      )
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
    })
  } catch (err: any) {
    console.error("[设备租赁管理API] 捕获到服务器错误:", err)
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
        details: err.message,
        data: [],
      },
      { status: 200 } // 返回 200 避免前端崩溃，但指示失败
    )
  }
}

