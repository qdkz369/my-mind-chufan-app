/**
 * GET: 获取餐厅的所有订单列表
 * 合并 delivery_orders 和 repair_orders 两个表的数据
 * 根据 restaurant_id 筛选
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
    const restaurantId = searchParams.get("restaurant_id")
    const status = searchParams.get("status") // 状态筛选：pending, accepted, delivering, processing, completed, cancelled

    if (!restaurantId) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

    // 构建配送订单查询
    let deliveryQuery = supabase
      .from("delivery_orders")
      .select("id, restaurant_id, product_type, service_type, status, amount, created_at, updated_at, assigned_to, worker_id")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })

    // 构建报修订单查询
    let repairQuery = supabase
      .from("repair_orders")
      .select("id, restaurant_id, service_type, status, amount, description, created_at, updated_at, assigned_to")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })

    // 状态筛选
    if (status && status !== "all") {
      deliveryQuery = deliveryQuery.eq("status", status)
      repairQuery = repairQuery.eq("status", status)
    }

    // 并行查询两个表
    const [deliveryResult, repairResult] = await Promise.all([
      deliveryQuery,
      repairQuery,
    ])

    if (deliveryResult.error) {
      console.error("[订单列表API] 查询配送订单失败:", deliveryResult.error)
    }

    if (repairResult.error) {
      console.error("[订单列表API] 查询报修订单失败:", repairResult.error)
    }

    // 合并结果并统一格式
    const deliveryOrders = (deliveryResult.data || []).map((order: any) => ({
      id: order.id,
      restaurant_id: order.restaurant_id,
      service_type: order.service_type || "燃料配送",
      status: order.status,
      amount: order.amount || 0,
      created_at: order.created_at,
      updated_at: order.updated_at,
      order_type: "delivery", // 标记为配送订单
      product_type: order.product_type,
      worker_id: order.worker_id || order.assigned_to,
    }))

    const repairOrders = (repairResult.data || []).map((order: any) => ({
      id: order.id,
      restaurant_id: order.restaurant_id,
      service_type: order.service_type || "维修服务",
      status: order.status,
      amount: order.amount || 0,
      created_at: order.created_at,
      updated_at: order.updated_at,
      order_type: "repair", // 标记为报修订单
      description: order.description,
      worker_id: order.assigned_to,
    }))

    // 合并所有订单并按创建时间排序
    const allOrders = [...deliveryOrders, ...repairOrders].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      return timeB - timeA // 降序，最新的在前
    })

    return NextResponse.json({
      success: true,
      data: allOrders,
    })
  } catch (error) {
    console.error("[订单列表API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
