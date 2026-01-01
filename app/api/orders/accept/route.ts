import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { OrderStatus, canTransitionOrderStatus } from "@/lib/types/order"

/**
 * POST: 客户确认验收订单
 * 将订单状态从 pending_acceptance 转为 active
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
    const { order_id } = body

    if (!order_id) {
      return NextResponse.json(
        { error: "缺少必要参数: order_id" },
        { status: 400 }
      )
    }

    // 查询订单当前状态
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, restaurant_id")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      )
    }

    // 验证状态是否可以流转
    if (!canTransitionOrderStatus(order.status as OrderStatus, OrderStatus.ACTIVE)) {
      return NextResponse.json(
        { error: `订单状态 ${order.status} 无法流转到 active` },
        { status: 400 }
      )
    }

    // 更新订单状态
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: OrderStatus.ACTIVE,
        customer_confirmed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id)
      .select("id, status, customer_confirmed, updated_at")
      .single()

    if (updateError) {
      console.error("[确认验收API] 更新订单失败:", updateError)
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
      message: "订单验收确认成功",
      data: updatedOrder,
    })
  } catch (error) {
    console.error("[确认验收API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

