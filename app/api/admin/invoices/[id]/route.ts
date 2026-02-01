// 管理端发票更新 API
// 认证：getUserContext（平台用户）

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * PATCH: 更新发票状态
 * Body: { status: "processing" | "issued" | "rejected", invoice_number?: string }
 * 当 status=issued 时，invoice_number 必填
 */
export async function PATCH(
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

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, error: "缺少发票ID" },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { status, invoice_number } = body

    if (!status || !["processing", "issued", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "无效的状态", details: "status 需为 processing/issued/rejected" },
        { status: 400 }
      )
    }

    if (status === "issued" && !invoice_number?.trim()) {
      return NextResponse.json(
        { success: false, error: "已开票状态需填写发票号" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !key) {
      return NextResponse.json(
        { success: false, error: "服务器配置错误" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 查询原记录，校验权限（多租户）
    const { data: existing, error: fetchError } = await supabase
      .from("invoices")
      .select("id, restaurant_id")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: "发票不存在" },
        { status: 404 }
      )
    }

    if (userContext.role !== "super_admin" && userContext.companyId) {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("company_id")
        .eq("id", existing.restaurant_id)
        .maybeSingle()
      if (!restaurant || restaurant.company_id !== userContext.companyId) {
        return NextResponse.json(
          { success: false, error: "无权操作该发票" },
          { status: 403 }
        )
      }
    }

    const updateData: Record<string, any> = { status }
    if (status === "issued") {
      updateData.invoice_number = invoice_number.trim()
      updateData.issued_at = new Date().toISOString()
    }

    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("[管理端发票API] 更新失败:", updateError)
      return NextResponse.json(
        { success: false, error: "更新失败", details: updateError.message },
        { status: 500 }
      )
    }

    await supabase.from("audit_logs").insert({
      actor_id: userContext.userId ?? null,
      action: "INVOICE_STATUS_UPDATED",
      target_type: "invoice",
      target_id: id,
      metadata: {
        new_status: status,
        invoice_number: status === "issued" ? invoice_number?.trim() : undefined,
        updated_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: status === "issued" ? "已标记为已开票" : "状态已更新",
      data: updated,
    })
  } catch (err: any) {
    console.error("[管理端发票API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
