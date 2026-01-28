// 获取当前用户关联的餐厅信息
// 用于自动填充下单页面的默认联系方式

import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

export async function GET(request: NextRequest) {
  try {
    // 获取用户上下文
    const userContext = await getUserContext(request)
    
    if (!userContext) {
      return NextResponse.json(
        {
          success: false,
          error: "未授权",
          details: "用户未登录或会话已过期",
        },
        { status: 401 }
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

    // 优先使用 Service Role Key，确保能访问到数据
    const keyToUse = serviceRoleKey || anonKey!
    const supabaseClient = createClient(
      supabaseUrl,
      keyToUse,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    console.log("[当前餐厅API] 查询用户关联餐厅，userId:", userContext.userId)

    // 查询用户关联的餐厅信息
    const { data: restaurants, error } = await supabaseClient
      .from("restaurants")
      .select(`
        id,
        name,
        contact_name,
        contact_phone,
        address,
        company_id,
        created_at
      `)
      .eq("user_id", userContext.userId)
      .limit(1)

    if (error) {
      console.error("[当前餐厅API] 查询失败:", error)
      return NextResponse.json(
        {
          success: false,
          error: "查询餐厅信息失败",
          details: error.message,
        },
        { status: 500 }
      )
    }

    if (!restaurants || restaurants.length === 0) {
      console.warn("[当前餐厅API] 用户未关联任何餐厅")
      return NextResponse.json(
        {
          success: false,
          error: "未找到餐厅信息",
          details: "当前用户未关联任何餐厅",
        },
        { status: 404 }
      )
    }

    const restaurant = restaurants[0]
    
    console.log("[当前餐厅API] ✅ 查询成功:", {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name
    })

    return NextResponse.json({
      success: true,
      data: restaurant,
    })
  } catch (error: any) {
    console.error("[当前餐厅API] 处理失败:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: "获取餐厅信息失败",
        details: error.message || "未知错误",
      },
      { status: 500 }
    )
  }
}