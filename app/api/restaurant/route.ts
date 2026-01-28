// ACCESS_LEVEL: PUBLIC (公开API)
// ALLOWED_ROLES: 无（公开访问）
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：公开API，用于根据qr_token获取餐厅信息，无需权限验证

import { NextResponse } from "next/server"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

// GET: 根据 qr_token 获取餐厅信息
export async function GET(request: Request) {
  try {
    // 检查 Supabase 是否已配置（使用后备值或环境变量）
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json(
        { error: "Supabase未正确配置，请检查环境变量或联系管理员" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const qrToken = searchParams.get("qr_token")
    const restaurantId = searchParams.get("id")

    // 支持通过 qr_token 或 id 查询
    if (!qrToken && !restaurantId) {
      return NextResponse.json(
        { error: "缺少必要参数: qr_token 或 id" },
        { status: 400 }
      )
    }

    // 根据 qr_token 或 id 查询餐厅信息
    // 注意：新结构使用 id (UUID) 作为主键，而不是 restaurant_id (TEXT)
    let query = supabase
      .from("restaurants")
      .select("id, name, address, qr_token, total_refilled, status, contact_name, contact_phone")
    
    if (restaurantId) {
      query = query.eq("id", restaurantId)
    } else if (qrToken) {
      query = query.eq("qr_token", qrToken)
    }
    
    const { data: restaurantData, error: restaurantError } = await query.single()

    if (restaurantError || !restaurantData) {
      // 提供更详细的错误信息，帮助用户排查问题
      const errorMessage = restaurantError 
        ? `无效的二维码：${restaurantError.message}` 
        : `无效的二维码：餐厅不存在（qr_token: ${qrToken}）\n\n提示：如果这是测试数据，请确保已在 Supabase 中创建了对应的测试餐厅。\n详见：docs/quick-test-restaurant-setup.md`
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }

    // 获取该餐厅的所有设备
    const { data: devicesData, error: devicesError } = await supabase
      .from("devices")
      .select("device_id, model, address, container_type, status, is_locked, restaurant_id, tank_capacity")
      .eq("restaurant_id", restaurantData.id)

    // 如果查询出错，记录错误但继续执行（允许设备列表为空）
    if (devicesError) {
      console.warn("获取设备列表时出现错误（可能是餐厅还没有设备）:", devicesError)
      // 不返回错误，而是返回空设备列表，允许继续安装新设备
    }

    // 获取每个设备的最新燃料百分比
    // 如果设备列表为空，直接返回空数组
    // 注意：supabase 已经在函数开头检查，这里可以安全使用
    const supabaseClient = supabase
    
    const devicesWithFuel = devicesData && devicesData.length > 0 && supabaseClient
      ? await Promise.all(
          devicesData.map(async (device) => {
            try {
              const { data: fuelData } = await supabaseClient
                .from("fuel_level")
                .select("percentage")
                .eq("device_id", device.device_id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle() // 使用 maybeSingle 而不是 single，允许没有燃料数据

              return {
                ...device,
                fuel_percentage: fuelData?.percentage || 0,
              }
            } catch (fuelError) {
              // 如果查询燃料数据失败，仍然返回设备信息，燃料百分比为0
              console.warn(`获取设备 ${device.device_id} 的燃料数据失败:`, fuelError)
              return {
                ...device,
                fuel_percentage: 0,
              }
            }
          })
        )
      : [] // 如果没有设备，返回空数组

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

