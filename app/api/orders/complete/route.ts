import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { OrderStatus, canTransitionOrderStatus } from "@/lib/types/order"

/**
 * POST: 完成配送
 * 将订单状态从 delivering 转为 completed
 * 需要提供 tracking_code 和 proof_image
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
    const { order_id, tracking_code, proof_image } = body

    if (!order_id) {
      return NextResponse.json(
        { error: "缺少必要参数: order_id" },
        { status: 400 }
      )
    }

    // 验证必要字段（配送完成必须提供溯源码和凭证）
    if (!tracking_code || !proof_image) {
      return NextResponse.json(
        { error: "完成配送必须提供 tracking_code 和 proof_image" },
        { status: 400 }
      )
    }

    // 查询订单当前状态
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      )
    }

    // 验证状态是否可以流转
    if (!canTransitionOrderStatus(order.status as OrderStatus, OrderStatus.COMPLETED)) {
      return NextResponse.json(
        { error: `订单状态 ${order.status} 无法流转到 completed` },
        { status: 400 }
      )
    }

    // 更新订单状态和配送信息
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: OrderStatus.COMPLETED,
        tracking_code: tracking_code,
        proof_image: proof_image,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id)
      .select("id, status, tracking_code, proof_image, updated_at")
      .single()

    if (updateError) {
      console.error("[完成配送API] 更新订单失败:", updateError)
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
      message: "配送完成",
      data: updatedOrder,
    })
  } catch (error) {
    console.error("[完成配送API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

