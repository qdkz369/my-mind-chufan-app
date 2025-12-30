import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET: 根据 qr_token 获取餐厅信息
export async function GET(request: Request) {
  try {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Supabase环境变量未配置" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const qrToken = searchParams.get("qr_token")

    if (!qrToken) {
      return NextResponse.json(
        { error: "缺少必要参数: qr_token" },
        { status: 400 }
      )
    }

    // 根据 qr_token 查询餐厅信息
    // 注意：新结构使用 id (UUID) 作为主键，而不是 restaurant_id (TEXT)
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, address, qr_token, total_refilled, status, contact_name, contact_phone")
      .eq("qr_token", qrToken)
      .single()

    if (restaurantError || !restaurantData) {
      return NextResponse.json(
        { error: "无效的二维码：餐厅不存在" },
        { status: 404 }
      )
    }

    // 获取该餐厅的所有设备
    const { data: devicesData, error: devicesError } = await supabase
      .from("devices")
      .select("device_id, model, address, container_type, status, is_locked, restaurant_id, tank_capacity")
      .eq("restaurant_id", restaurantData.id)

    if (devicesError) {
      console.error("获取设备列表失败:", devicesError)
      return NextResponse.json(
        { error: "获取设备列表失败", details: devicesError.message },
        { status: 500 }
      )
    }

    // 获取每个设备的最新燃料百分比
    const devicesWithFuel = await Promise.all(
      (devicesData || []).map(async (device) => {
        const { data: fuelData } = await supabase
          .from("fuel_level")
          .select("percentage")
          .eq("device_id", device.device_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        return {
          ...device,
          fuel_percentage: fuelData?.percentage || 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      restaurant: {
        restaurant_id: restaurantData.id, // 为了兼容性，同时返回 id 和 restaurant_id
        id: restaurantData.id,
        name: restaurantData.name,
        address: restaurantData.address,
        qr_token: restaurantData.qr_token,
        total_refilled: restaurantData.total_refilled || 0,
        status: restaurantData.status || "active",
        contact_name: restaurantData.contact_name,
        contact_phone: restaurantData.contact_phone,
      },
      devices: devicesWithFuel,
    })
  } catch (error) {
    console.error("获取餐厅信息错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误", details: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    )
  }
}

