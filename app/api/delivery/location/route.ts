// ACCESS_LEVEL: STAFF_LEVEL
// ALLOWED_ROLES: staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：只能 staff 调用，必须绑定 worker_id，后续必须使用 RLS 限制只能访问自己数据

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET: 获取配送员实时GPS位置
export async function GET(request: Request) {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // 如果环境变量未配置，返回默认位置
      return NextResponse.json({
        lat: 25.0389,
        lon: 102.7183,
        deliveryId: "default",
        isDefault: true,
      })
    }

    const { searchParams } = new URL(request.url)
    const deliveryId = searchParams.get("deliveryId") || "default" // 默认配送员ID

    // 检查 supabase 客户端是否可用
    if (!supabase) {
      // 如果 supabase 不可用，返回默认位置
      return NextResponse.json({
        lat: 25.0389,
        lon: 102.7183,
        deliveryId: deliveryId,
        isDefault: true,
      })
    }

    // 从数据库获取配送员实时位置
    const { data, error } = await supabase
      .from("delivery_locations")
      .select("lat, lon, updated_at")
      .eq("delivery_id", deliveryId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("获取配送员位置失败:", error)
      // 如果数据库中没有数据，返回默认位置（昆明市）
      return NextResponse.json({
        lat: 25.0389,
        lon: 102.7183,
        deliveryId: deliveryId,
        isDefault: true,
      })
    }

    if (data) {
      return NextResponse.json({
        lat: data.lat,
        lon: data.lon,
        deliveryId: deliveryId,
        updatedAt: data.updated_at,
        isDefault: false,
      })
    }

    // 默认返回昆明市坐标
    return NextResponse.json({
      lat: 25.0389,
      lon: 102.7183,
      deliveryId: deliveryId,
      isDefault: true,
    })
  } catch (error) {
    console.error("获取配送员位置错误:", error)
    return NextResponse.json(
      { error: "获取配送员位置失败" },
      { status: 500 }
    )
  }
}

// POST: 更新配送员GPS位置（由配送员手机端调用）
export async function POST(request: Request) {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase环境变量未配置" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { deliveryId, lat, lon } = body

    if (!deliveryId || lat === undefined || lon === undefined) {
      return NextResponse.json(
        { error: "缺少必要参数: deliveryId, lat, lon" },
        { status: 400 }
      )
    }

    // 检查 supabase 客户端是否可用
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    // 更新或插入配送员位置
    const { data, error } = await supabase
      .from("delivery_locations")
      .upsert(
        {
          delivery_id: deliveryId,
          lat: lat,
          lon: lon,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "delivery_id",
        }
      )
      .select()
      .single()

    if (error) {
      console.error("更新配送员位置失败:", error)
      return NextResponse.json(
        { error: "更新配送员位置失败" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error) {
    console.error("更新配送员位置错误:", error)
    return NextResponse.json(
      { error: "更新配送员位置失败" },
      { status: 500 }
    )
  }
}

