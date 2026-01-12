/**
 * 获取餐厅最近一次配送订单 ID API（Read-Only）
 * 
 * GET /api/facts/restaurant/:restaurant_id/latest-order
 * 
 * 核心原则：
 * - 只 SELECT（只读）
 * - 不写入
 * - 不推断
 * - 不修改 status
 * 
 * 返回结构：
 * {
 *   "order_id": string | null
 * }
 * 
 * 用途：获取最近一次完成的订单 ID，用于后续调用订单事实 API
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
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { restaurant_id } = await params

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

    // 权限验证：验证用户是否有权限访问指定的 restaurant_id
    const accessCheck = await verifyFactAccess(request, restaurant_id)
    if (accessCheck) {
      return accessCheck
    }

    // 查询最近一次完成的订单 ID
    const { data: latestOrderData, error: latestOrderError } = await supabase
      .from("delivery_orders")
      .select("id")
      .eq("restaurant_id", restaurant_id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestOrderError) {
      console.error("[餐厅最近订单API] 查询失败:", latestOrderError)
      // 查询失败时返回 null，不阻断流程
      return NextResponse.json({
        success: true,
        order_id: null,
      })
    }

    return NextResponse.json({
      success: true,
      order_id: latestOrderData?.id || null,
    })
  } catch (error) {
    console.error("[餐厅最近订单API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
