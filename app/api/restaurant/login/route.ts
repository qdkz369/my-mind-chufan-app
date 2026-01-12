// ACCESS_LEVEL: PUBLIC (公开API)
// ALLOWED_ROLES: 无（公开访问）
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：公开API，用于餐厅登录，无需权限验证

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

/**
 * 餐厅登录API
 * 通过手机号查询餐厅信息
 */
export async function POST(request: Request) {
  // 添加调试日志，确认路由被调用
  console.log("[登录API] POST /api/restaurant/login 被调用")
  
  try {
    if (!supabase) {
      console.error("[登录API] Supabase客户端未初始化")
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { phone } = body
    
    console.log("[登录API] 收到登录请求，手机号:", phone ? `${phone.substring(0, 3)}****${phone.substring(7)}` : "未提供")

    // 验证必要参数
    if (!phone) {
      return NextResponse.json(
        { error: "缺少必要参数: phone" },
        { status: 400 }
      )
    }

    // 通过手机号查询餐厅信息
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .select("id, name, contact_name, contact_phone, address, latitude, longitude, status, qr_token, total_refilled, created_at, updated_at")
      .eq("contact_phone", phone)
      .maybeSingle()

    if (error) {
      console.error("[登录API] 查询餐厅失败:", error)
      return NextResponse.json(
        { error: "查询失败", details: error.message },
        { status: 500 }
      )
    }

    if (!restaurant) {
      return NextResponse.json(
        { error: "未找到该手机号对应的餐厅，请先注册" },
        { status: 404 }
      )
    }

    console.log("[登录API] 登录成功:", restaurant.id)

    return NextResponse.json({
      success: true,
      message: "登录成功",
      data: {
        restaurant_id: restaurant.id,
        name: restaurant.name,
        contact_name: restaurant.contact_name,
        contact_phone: restaurant.contact_phone,
        address: restaurant.address,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        status: restaurant.status,
        qr_token: restaurant.qr_token,
        total_refilled: restaurant.total_refilled,
      },
    })
  } catch (error) {
    console.error("[登录API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

