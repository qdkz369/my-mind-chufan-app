import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { OrderStatus, ProductType } from "@/lib/types/order"

/**
 * GET: 获取待接单订单列表
 * 根据产品类型和配送员ID筛选
 */
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productType = searchParams.get("product_type") // 产品类型筛选
    const workerId = searchParams.get("worker_id") // 配送员ID（可选，用于查看已接单的订单）

    // 构建查询
    let query = supabase
      .from("orders")
      .select(
        "id, restaurant_id, product_type, service_type, status, amount, assigned_to, worker_id, tracking_code, proof_image, customer_confirmed, created_at, updated_at, restaurants(id, name, address, contact_phone)"
      )
      .in("status", [OrderStatus.PROCESSING, OrderStatus.DELIVERING]) // 待派单或配送中

    // 如果指定了产品类型，进行筛选
    if (productType) {
      query = query.eq("product_type", productType)
    }

    // 如果指定了配送员ID，显示该配送员的订单
    if (workerId) {
      query = query.or(`assigned_to.eq.${workerId},worker_id.eq.${workerId}`)
    } else {
      // 如果没有指定配送员，只显示未分配的订单（待派单）
      query = query.is("assigned_to", null).is("worker_id", null)
    }

    const { data: orders, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[待接单订单API] 查询失败:", error)
      return NextResponse.json(
        {
          error: "查询失败",
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
    })
  } catch (error) {
    console.error("[待接单订单API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

