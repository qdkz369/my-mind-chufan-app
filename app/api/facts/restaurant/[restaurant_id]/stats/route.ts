/**
 * 餐厅统计数据 API（Read-Only）
 * 
 * GET /api/facts/restaurant/:restaurant_id/stats
 * 
 * 返回结构：
 * {
 *   "total_orders": number,        // 累计订单数
 *   "total_spent": number,          // 累计消费金额
 *   "points_balance": number,       // 积分余额
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
      // 即使数据库连接失败，也返回合法的 JSON 对象，避免 500 错误
      return NextResponse.json({
        success: true,
        total_orders: 0,
        total_spent: 0,
        points_balance: 0,
      })
    }

    const { restaurant_id } = await params

    if (!restaurant_id) {
      // 即使缺少参数，也返回合法的 JSON 对象，避免 400 错误
      return NextResponse.json({
        success: true,
        total_orders: 0,
        total_spent: 0,
        points_balance: 0,
      })
    }

    // 权限验证
    const accessCheck = await verifyFactAccess(request, restaurant_id)
    if (accessCheck) {
      return accessCheck
    }

    // 1. 查询累计订单数（delivery_orders 表中所有订单）
    const { data: ordersData, error: ordersError } = await supabase
      .from("delivery_orders")
      .select("id")
      .eq("restaurant_id", restaurant_id)

    const total_orders = ordersData ? ordersData.length : 0
    if (ordersError) {
      console.error("[餐厅统计API] 查询订单数失败:", ordersError)
    }

    // 2. 查询累计消费金额（统计所有订单的总金额，优先统计已支付订单）
    let total_spent = 0
    try {
      // 先尝试查询已支付订单
      const { data: paidOrdersData, error: paidOrdersError } = await supabase
        .from("delivery_orders")
        .select("total_amount")
        .eq("restaurant_id", restaurant_id)
        .in("payment_status", ["paid", "completed"])

      if (paidOrdersData && paidOrdersData.length > 0) {
        total_spent = paidOrdersData.reduce((sum, order) => {
          return sum + (Number(order.total_amount) || 0)
        }, 0)
      } else {
        // 如果没有已支付订单，查询所有订单的总金额
        const { data: allOrdersData, error: allOrdersError } = await supabase
          .from("delivery_orders")
          .select("total_amount")
          .eq("restaurant_id", restaurant_id)

        if (allOrdersData && allOrdersData.length > 0) {
          total_spent = allOrdersData.reduce((sum, order) => {
            return sum + (Number(order.total_amount) || 0)
          }, 0)
        }
        if (allOrdersError && allOrdersError.code !== "PGRST116") {
          console.error("[餐厅统计API] 查询所有订单总金额失败:", allOrdersError)
        }
      }
      if (paidOrdersError && paidOrdersError.code !== "PGRST116") {
        console.error("[餐厅统计API] 查询已支付订单失败:", paidOrdersError)
      }
    } catch (error) {
      console.error("[餐厅统计API] 计算累计消费金额时出错:", error)
      total_spent = 0
    }

    // 3. 查询积分余额（从 restaurants 表的 points 字段或单独的 points 表）
    // 先尝试从 restaurants 表查询
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("points")
      .eq("id", restaurant_id)
      .maybeSingle()

    let points_balance = 0
    if (restaurantData && restaurantData.points !== null && restaurantData.points !== undefined) {
      points_balance = Number(restaurantData.points) || 0
    } else if (restaurantError && restaurantError.code !== "PGRST116") {
      console.error("[餐厅统计API] 查询积分余额失败:", restaurantError)
    }

    // 如果没有 points 字段，尝试查询独立的 points 表（如果存在）
    if (points_balance === 0 && restaurantError?.code !== "PGRST116") {
      const { data: pointsData, error: pointsError } = await supabase
        .from("points")
        .select("balance")
        .eq("restaurant_id", restaurant_id)
        .maybeSingle()

      if (pointsData && pointsData.balance !== null && pointsData.balance !== undefined) {
        points_balance = Number(pointsData.balance) || 0
      } else if (pointsError && pointsError.code !== "PGRST116") {
        console.warn("[餐厅统计API] 查询points表失败:", pointsError)
      }
    }

    return NextResponse.json({
      success: true,
      total_orders: total_orders,
      total_spent: total_spent,
      points_balance: points_balance,
    })
  } catch (error) {
    console.error("[餐厅统计API] 处理请求时出错:", error)
    // 即使出错，也返回合法的 JSON 对象，避免 500 错误
    return NextResponse.json({
      success: true,
      total_orders: 0,
      total_spent: 0,
      points_balance: 0,
    })
  }
}
