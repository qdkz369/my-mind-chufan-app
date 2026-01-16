/**
 * Facts API - 设备运行天数统计（Read-Only）
 * 
 * GET /api/facts/restaurant/:restaurant_id/device-running-days
 * 
 * 返回结构：
 * {
 *   "success": true,
 *   "running_days": number,          // 运行天数（从最早绑定设备的时间开始算）
 * }
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyFactAccess } from "@/lib/auth/facts-auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurant_id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json({
        success: true,
        running_days: 0,
      })
    }

    const { restaurant_id } = await params

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

    // 权限验证
    const accessCheck = await verifyFactAccess(request, restaurant_id)
    if (accessCheck) {
      return accessCheck
    }

    // 1. 查询该餐厅的所有设备（从 devices 表）
    const { data: devicesData, error: devicesError } = await supabase
      .from("devices")
      .select("device_id, created_at, updated_at")
      .eq("restaurant_id", restaurant_id)

    if (devicesError) {
      console.error("[设备运行天数API] 查询设备失败:", devicesError)
      return NextResponse.json({
        success: true,
        running_days: 0,
      })
    }

    if (!devicesData || devicesData.length === 0) {
      return NextResponse.json({
        success: true,
        running_days: 0,
      })
    }

    // 2. 查询设备租赁记录，获取最早的绑定时间
    const deviceIds = devicesData.map((d: any) => d.device_id)
    const { data: rentalsData, error: rentalsError } = await supabase
      .from("device_rentals")
      .select("device_id, start_at")
      .eq("restaurant_id", restaurant_id)
      .in("device_id", deviceIds)
      .eq("status", "active")
      .order("start_at", { ascending: true })

    // 3. 计算最早绑定时间
    let earliestBindingTime: Date | null = null

    // 优先使用 device_rentals 的 start_at（更准确）
    if (rentalsData && rentalsData.length > 0) {
      const earliestRental = rentalsData[0]
      if (earliestRental.start_at) {
        earliestBindingTime = new Date(earliestRental.start_at)
      }
    }

    // 如果没有租赁记录，使用 devices 表的 created_at 作为备选
    if (!earliestBindingTime) {
      const deviceCreatedTimes = devicesData
        .map((d: any) => d.created_at ? new Date(d.created_at) : null)
        .filter((d: Date | null): d is Date => d !== null)
      
      if (deviceCreatedTimes.length > 0) {
        earliestBindingTime = new Date(Math.min(...deviceCreatedTimes.map(d => d.getTime())))
      }
    }

    // 4. 计算运行天数
    if (!earliestBindingTime) {
      return NextResponse.json({
        success: true,
        running_days: 0,
      })
    }

    const now = new Date()
    const diffTime = now.getTime() - earliestBindingTime.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    // 确保天数不为负数
    const running_days = Math.max(0, diffDays)

    return NextResponse.json({
      success: true,
      running_days: running_days,
    })
  } catch (error) {
    console.error("[设备运行天数API] 处理请求失败:", error)
    return NextResponse.json({
      success: true,
      running_days: 0,
    })
  }
}
