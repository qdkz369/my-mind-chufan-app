/**
 * 对公支付 - 确认收款
 * POST /api/orders/[id]/confirm-corporate-payment
 * Body: { confirmed: true, invoice_number?: string, note?: string }
 * 仅允许 company_admin / platform_admin / super_admin
 */

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getUserContext } from "@/lib/auth/user-context"

const ALLOWED_ROLES = ["company_admin", "platform_admin", "super_admin"]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userContext = await getUserContext(request)

    if (!userContext) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    if (!ALLOWED_ROLES.includes(userContext.role)) {
      return NextResponse.json(
        { success: false, error: "权限不足", details: "仅管理员可确认对公收款" },
        { status: 403 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const orderId = (await params).id

    const { data: orderData, error: oErr } = await supabase
      .from("delivery_orders")
      .select("id, restaurant_id, company_id, payment_method, payment_status")
      .eq("id", orderId)
      .single()

    if (oErr || !orderData) {
      return NextResponse.json(
        { success: false, error: "订单不存在" },
        { status: 404 }
      )
    }

    if (orderData.payment_method !== "corporate") {
      return NextResponse.json(
        { success: false, error: "该订单不是对公支付订单" },
        { status: 400 }
      )
    }

    if (orderData.payment_status === "transfer_confirmed") {
      return NextResponse.json(
        { success: false, error: "该订单已确认收款" },
        { status: 400 }
      )
    }

    // 多租户：非 super_admin 仅能操作本公司订单
    if (
      userContext.role !== "super_admin" &&
      userContext.companyId &&
      orderData.company_id !== userContext.companyId
    ) {
      return NextResponse.json(
        { success: false, error: "无权操作此订单" },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { confirmed, invoice_number, note } = body

    if (confirmed !== true) {
      return NextResponse.json(
        { success: false, error: "请传入 confirmed: true" },
        { status: 400 }
      )
    }

    const updatePayload: Record<string, unknown> = {
      payment_status: "transfer_confirmed",
      updated_at: new Date().toISOString(),
    }
    const { error: updateErr } = await supabase
      .from("delivery_orders")
      .update(updatePayload)
      .eq("id", orderId)

    if (updateErr) {
      console.error("[确认对公收款API] 更新失败:", updateErr)
      return NextResponse.json(
        { success: false, error: "更新失败", details: updateErr.message },
        { status: 500 }
      )
    }

    const { error: auditErr } = await supabase.from("audit_logs").insert({
      actor_id: userContext.userId,
      action: "CORPORATE_PAYMENT_CONFIRMED",
      target_type: "delivery_order",
      target_id: orderId,
      metadata: {
        invoice_number: invoice_number ?? null,
        note: note ?? null,
        confirmed_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    })

    if (auditErr) {
      console.warn("[确认对公收款API] 审计日志写入失败:", auditErr)
    }

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        payment_status: "transfer_confirmed",
      },
    })
  } catch (error) {
    console.error("[确认对公收款API] 错误:", error)
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
