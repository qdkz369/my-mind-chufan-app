import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET: 获取商户注册时的定位地址
export async function GET(request: Request) {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // 如果环境变量未配置，返回null
      return NextResponse.json({
        merchantId: "default",
        lat: null,
        lon: null,
        address: null,
        city: null,
      })
    }

    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get("merchantId") || "default" // 默认商户ID

    // 从数据库获取商户注册位置
    const { data, error } = await supabase
      .from("merchant_locations")
      .select("lat, lon, address, city, registered_at")
      .eq("merchant_id", merchantId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("获取商户位置失败:", error)
      return NextResponse.json(
        { error: "获取商户位置失败" },
        { status: 500 }
      )
    }

    if (data) {
      return NextResponse.json({
        lat: data.lat,
        lon: data.lon,
        address: data.address,
        city: data.city,
        merchantId: merchantId,
        registeredAt: data.registered_at,
      })
    }

    // 如果没有找到商户位置，返回null
    return NextResponse.json({
      merchantId: merchantId,
      lat: null,
      lon: null,
      address: null,
      city: null,
    })
  } catch (error) {
    console.error("获取商户位置错误:", error)
    return NextResponse.json(
      { error: "获取商户位置失败" },
      { status: 500 }
    )
  }
}

// POST: 注册或更新商户定位地址
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
    const { merchantId, lat, lon, address, city } = body

    if (!merchantId || lat === undefined || lon === undefined) {
      return NextResponse.json(
        { error: "缺少必要参数: merchantId, lat, lon" },
        { status: 400 }
      )
    }

    // 更新或插入商户位置
    const { data, error } = await supabase
      .from("merchant_locations")
      .upsert(
        {
          merchant_id: merchantId,
          lat: lat,
          lon: lon,
          address: address || null,
          city: city || null,
          registered_at: new Date().toISOString(),
        },
        {
          onConflict: "merchant_id",
        }
      )
      .select()
      .single()

    if (error) {
      console.error("保存商户位置失败:", error)
      return NextResponse.json(
        { error: "保存商户位置失败" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error) {
    console.error("保存商户位置错误:", error)
    return NextResponse.json(
      { error: "保存商户位置失败" },
      { status: 500 }
    )
  }
}

