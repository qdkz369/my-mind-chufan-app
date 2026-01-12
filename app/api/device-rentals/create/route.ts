/**
 * 创建设备租赁记录 API
 * 
 * POST /api/device-rentals/create
 * 
 * 功能：为设备创建租赁记录
 * - 指定设备
 * - 指定餐厅
 * - 设置开始时间
 * 
 * 注意：
 * - 不涉及租金计算
 * - 不涉及金融逻辑
 * - 只记录使用关系
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { device_id, restaurant_id, start_at } = body

    // 验证必需字段
    if (!device_id || !restaurant_id || !start_at) {
      return NextResponse.json(
        { error: "缺少必需字段：device_id, restaurant_id, start_at" },
        { status: 400 }
      )
    }

    // 验证设备是否存在
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("device_id")
      .eq("device_id", device_id)
      .single()

    if (deviceError || !device) {
      return NextResponse.json(
        { error: "设备不存在" },
        { status: 404 }
      )
    }

    // 验证餐厅是否存在
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "餐厅不存在" },
        { status: 404 }
      )
    }

    // 检查该设备是否已有活跃的租赁记录
    const { data: activeRentals, error: checkError } = await supabase
      .from("device_rentals")
      .select("id")
      .eq("device_id", device_id)
      .eq("status", "active")
      .is("end_at", null)

    if (checkError) {
      console.error("[设备租赁API] 检查活跃租赁失败:", checkError)
      return NextResponse.json(
        { error: "检查设备租赁状态失败" },
        { status: 500 }
      )
    }

    if (activeRentals && activeRentals.length > 0) {
      return NextResponse.json(
        { error: "该设备已有活跃的租赁记录，请先结束现有租赁" },
        { status: 400 }
      )
    }

    // 创建租赁记录
    const { data: rental, error: createError } = await supabase
      .from("device_rentals")
      .insert({
        device_id,
        restaurant_id,
        start_at,
        end_at: null, // 新创建的租赁记录，结束时间为空
        status: "active",
      })
      .select("*")
      .single()

    if (createError) {
      console.error("[设备租赁API] 创建失败:", createError)
      return NextResponse.json(
        { error: "创建租赁记录失败", details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: rental,
      message: "设备租赁记录创建成功",
    })
  } catch (err: any) {
    console.error("[设备租赁API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
