/**
 * 获取设备租赁记录列表 API
 * 
 * GET /api/device-rentals/list
 * 
 * 功能：获取设备租赁记录列表
 * 
 * 查询参数：
 * - device_id: 设备ID（可选）
 * - restaurant_id: 餐厅ID（可选）
 * - status: 状态（active / ended，可选）
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device_id")
    const restaurantId = searchParams.get("restaurant_id")
    const status = searchParams.get("status")

    // 构建查询
    let query = supabase
      .from("device_rentals")
      .select(`
        *,
        devices:device_id (
          device_id,
          model,
          status
        ),
        restaurants:restaurant_id (
          id,
          name,
          address
        )
      `)
      .order("created_at", { ascending: false })

    // 应用筛选条件
    if (deviceId) {
      query = query.eq("device_id", deviceId)
    }

    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data: rentals, error } = await query

    if (error) {
      console.error("[设备租赁API] 查询失败:", error)
      return NextResponse.json(
        { error: "查询租赁记录失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: rentals || [],
    })
  } catch (err: any) {
    console.error("[设备租赁API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
