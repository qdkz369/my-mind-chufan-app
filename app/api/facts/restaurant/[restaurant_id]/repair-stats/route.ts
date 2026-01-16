/**
 * Facts API - 报修统计数据（Read-Only）
 * 
 * GET /api/facts/restaurant/:restaurant_id/repair-stats
 * 
 * 返回结构：
 * {
 *   "success": true,
 *   "response_rate": number,          // 响应率（0-100）
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
        response_rate: 0,
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

    // 查询该餐厅的所有报修订单
    const { data: repairOrdersData, error: repairOrdersError } = await supabase
      .from("repair_orders")
      .select("id, status, assigned_to, created_at, updated_at")
      .eq("restaurant_id", restaurant_id)

    if (repairOrdersError) {
      console.error("[报修统计API] 查询报修订单失败:", repairOrdersError)
      return NextResponse.json({
        success: true,
        response_rate: 0,
      })
    }

    const totalOrders = repairOrdersData ? repairOrdersData.length : 0

    if (totalOrders === 0) {
      return NextResponse.json({
        success: true,
        response_rate: 0,
      })
    }

    // 计算响应率：已响应的订单数 / 总订单数
    // 响应定义为：订单状态不是 pending，或者已分配工人（assigned_to 不为空）
    let respondedCount = 0
    if (repairOrdersData) {
      repairOrdersData.forEach((order: any) => {
        // 如果订单状态不是 pending，或者已分配工人，算作已响应
        if (order.status !== "pending" || order.assigned_to !== null) {
          respondedCount++
        }
      })
    }

    const response_rate = Math.round((respondedCount / totalOrders) * 100 * 10) / 10  // 保留一位小数

    return NextResponse.json({
      success: true,
      response_rate: response_rate,
    })
  } catch (error) {
    console.error("[报修统计API] 处理请求失败:", error)
    return NextResponse.json({
      success: true,
      response_rate: 0,
    })
  }
}
