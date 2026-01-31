/**
 * 对公支付 - 授信额度校验
 * GET /api/orders/credit-check?restaurant_id=xxx&amount=1234.56
 * 返回：可用授信、已用授信、授信总额、是否可立即配送
 */

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get("restaurant_id")
    const amountStr = request.nextUrl.searchParams.get("amount")

    if (!restaurantId?.trim()) {
      return NextResponse.json(
        { success: false, error: "缺少 restaurant_id" },
        { status: 400 }
      )
    }

    const amount = amountStr ? parseFloat(amountStr) : 0
    if (isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { success: false, error: "无效的 amount" },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { data: restaurantData, error: rErr } = await supabase
      .from("restaurants")
      .select("id, credit_line")
      .eq("id", restaurantId)
      .single()

    if (rErr || !restaurantData) {
      return NextResponse.json(
        { success: false, error: "餐厅不存在" },
        { status: 404 }
      )
    }

    const creditLine = Number(restaurantData.credit_line) || 0

    // 已用授信 = 对公支付且待转账确认的订单金额之和
    const { data: pendingOrders, error: oErr } = await supabase
      .from("delivery_orders")
      .select("amount")
      .eq("restaurant_id", restaurantId)
      .eq("payment_method", "corporate")
      .eq("payment_status", "pending_transfer")

    if (oErr) {
      console.error("[授信校验API] 查询待转账订单失败:", oErr)
      return NextResponse.json(
        { success: false, error: "查询授信失败" },
        { status: 500 }
      )
    }

    const used =
      (pendingOrders ?? []).reduce(
        (sum: number, row: { amount?: number | null }) =>
          sum + (Number(row.amount) || 0),
        0
      ) || 0

    const available = Math.max(0, creditLine - used)
    const canDeliver = creditLine > 0 && amount <= available

    return NextResponse.json({
      success: true,
      data: {
        credit_line: creditLine,
        used,
        available,
        order_amount: amount,
        can_deliver: canDeliver,
      },
    })
  } catch (error) {
    console.error("[授信校验API] 错误:", error)
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
