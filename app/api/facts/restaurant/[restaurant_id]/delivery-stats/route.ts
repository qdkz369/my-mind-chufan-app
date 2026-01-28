/**
 * Facts API - 今日配送统计数据（Read-Only）
 * 
 * GET /api/facts/restaurant/:restaurant_id/delivery-stats
 * 
 * 返回结构：
 * {
 *   "success": true,
 *   "today_deliveries": number,      // 今日配送订单数
 *   "on_time_rate": number,          // 准时率（0-100）
 * }
 */

import { NextResponse, NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyFactAccess } from "@/lib/auth/facts-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurant_id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json({
        success: true,
        today_deliveries: 0,
        on_time_rate: 0,
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

    // 获取今天的开始和结束时间
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.toISOString()
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    const todayEndStr = todayEnd.toISOString()

    // 1. 查询今日配送订单数（状态为 completed 的订单）
    const { data: todayOrdersData, error: todayOrdersError } = await supabase
      .from("delivery_orders")
      .select("id, scheduled_delivery_at, updated_at")
      .eq("restaurant_id", restaurant_id)
      .eq("status", "completed")
      .gte("updated_at", todayStart)
      .lte("updated_at", todayEndStr)

    if (todayOrdersError) {
      console.error("[今日配送统计API] 查询今日订单失败:", todayOrdersError)
    }

    const today_deliveries = todayOrdersData ? todayOrdersData.length : 0

    // 2. 计算准时率（已完成订单中，实际送达时间在计划时间内的比例）
    let on_time_count = 0
    let total_completed = 0

    if (todayOrdersData && todayOrdersData.length > 0) {
      // 查询最近30天的已完成订单来计算准时率（更准确）
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString()

      const { data: recentOrdersData, error: recentOrdersError } = await supabase
        .from("delivery_orders")
        .select("scheduled_delivery_at, updated_at")
        .eq("restaurant_id", restaurant_id)
        .eq("status", "completed")
        .gte("updated_at", thirtyDaysAgoStr)

      if (!recentOrdersError && recentOrdersData) {
        total_completed = recentOrdersData.length
        recentOrdersData.forEach((order: any) => {
          if (order.scheduled_delivery_at && order.updated_at) {
            const scheduled = new Date(order.scheduled_delivery_at)
            const actual = new Date(order.updated_at)
            // 如果实际送达时间在计划时间之后（延迟），不算准时
            // 如果实际送达时间在计划时间之前或相等，算准时
            if (actual <= scheduled || (actual.getTime() - scheduled.getTime()) <= 30 * 60 * 1000) {
              // 允许30分钟误差
              on_time_count++
            }
          }
        })
      }
    }

    const on_time_rate = total_completed > 0 
      ? Math.round((on_time_count / total_completed) * 100 * 10) / 10  // 保留一位小数
      : 0

    return NextResponse.json({
      success: true,
      today_deliveries: today_deliveries,
      on_time_rate: on_time_rate,
    })
  } catch (error) {
    console.error("[今日配送统计API] 处理请求失败:", error)
    return NextResponse.json({
      success: true,
      today_deliveries: 0,
      on_time_rate: 0,
    })
  }
}
