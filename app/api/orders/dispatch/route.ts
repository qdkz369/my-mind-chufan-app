import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { OrderStatus, canTransitionOrderStatus } from "@/lib/types/order"

/**
 * POST: 配送员接单
 * 将订单状态从 processing 转为 delivering
 */
export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { order_id, worker_id } = body

    if (!order_id || !worker_id) {
      return NextResponse.json(
        { error: "缺少必要参数: order_id, worker_id" },
        { status: 400 }
      )
    }

    // 查询订单当前状态
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, product_type, assigned_to, worker_id")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      )
    }

    // 验证状态是否可以流转
    if (!canTransitionOrderStatus(order.status as OrderStatus, OrderStatus.DELIVERING)) {
      return NextResponse.json(
        { error: `订单状态 ${order.status} 无法流转到 delivering` },
        { status: 400 }
      )
    }

    // 更新订单状态和配送员
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: OrderStatus.DELIVERING,
        assigned_to: worker_id,
        worker_id: worker_id, // 兼容旧字段
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id)
      .select("id, status, assigned_to, worker_id, updated_at")
      .single()

    if (updateError) {
      console.error("[接单API] 更新订单失败:", updateError)
      return NextResponse.json(
        {
          error: "更新订单失败",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "接单成功",
      data: updatedOrder,
    })
  } catch (error) {
    console.error("[接单API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

