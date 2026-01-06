import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { canTransitionOrderStatus } from "@/lib/types/order"
import { verifyWorkerPermission } from "@/lib/auth/worker-auth"

/**
 * POST: 配送员接单
 * 将订单状态从 processing 转为 delivering
 * 需要配送员权限
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
    
    // 验证配送员权限
    const authResult = await verifyWorkerPermission(request, "delivery", body)
    if (authResult instanceof NextResponse) {
      return authResult // 返回错误响应
    }
    const worker = authResult.worker
    console.log("[派单API] 权限验证通过，配送员:", worker.name)
    
    const { id, order_id, worker_id } = body

    // 统一使用 id，兼容 order_id
    const orderId = id || order_id

    if (!orderId || !worker_id) {
      return NextResponse.json(
        { error: "缺少必要参数: id, worker_id" },
        { status: 400 }
      )
    }

    // 查询订单当前状态
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, product_type, assigned_to, worker_id")
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      )
    }

    // 验证状态是否可以流转（使用小写字符串）
    if (!canTransitionOrderStatus(order.status as any, "delivering")) {
      return NextResponse.json(
        { error: `订单状态 ${order.status} 无法流转到 delivering` },
        { status: 400 }
      )
    }

    // 更新订单状态和配送员（使用小写字符串）
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "delivering",
        assigned_to: worker_id,
        worker_id: worker_id, // 兼容旧字段
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
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

