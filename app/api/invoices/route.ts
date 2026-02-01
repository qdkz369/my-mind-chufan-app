// 发票管理 API
// 认证：x-restaurant-id（客户端用户）或 getUserContext（平台用户）

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取当前用户的发票记录列表
 */
export async function GET(request: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(request)
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    const supabase = createSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "服务器配置错误" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = Math.min(parseInt(searchParams.get("page_size") || "20"), 50)
    const status = searchParams.get("status")

    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data: invoiceList, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1)

    if (error) {
      console.error("[发票API] 查询失败:", error)
      return NextResponse.json(
        { success: false, error: "查询失败", details: error.message },
        { status: 500 }
      )
    }

    const orderMainIds = [...new Set((invoiceList || []).map((i: any) => i.order_main_id).filter(Boolean))]
    let orderMap: Record<string, any> = {}
    if (orderMainIds.length > 0) {
      const { data: orders } = await supabase
        .from("order_main")
        .select("id, order_number, order_type, total_amount, created_at")
        .in("id", orderMainIds)
      if (orders) {
        orderMap = orders.reduce((acc: Record<string, any>, o: any) => {
          acc[o.id] = o
          return acc
        }, {})
      }
    }

    const invoices = (invoiceList || []).map((inv: any) => {
      const om = orderMap[inv.order_main_id]
      return {
        id: inv.id,
        order_main_id: inv.order_main_id,
        order_number: om?.order_number,
        order_type: om?.order_type,
        amount: inv.amount,
        invoice_type: inv.invoice_type,
        company_name: inv.company_name,
        status: inv.status,
        invoice_number: inv.invoice_number,
        issued_at: inv.issued_at,
        created_at: inv.created_at,
        invoice_file_url: inv.invoice_file_url,
      }
    })

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    })
  } catch (err: any) {
    console.error("[发票API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

/**
 * POST: 申请开票
 * Body: { order_main_id, invoice_type?, title_type?, company_name, tax_id?, address?, phone?, bank_name?, bank_account?, email? }
 */
export async function POST(request: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(request)
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const {
      order_main_id,
      invoice_type = "normal",
      title_type = "enterprise",
      company_name,
      tax_id,
      address,
      phone,
      bank_name,
      bank_account,
      email,
    } = body

    if (!order_main_id || !company_name?.trim()) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数", details: "请提供订单ID和公司名称/抬头" },
        { status: 400 }
      )
    }

    if (title_type === "enterprise" && !tax_id?.trim()) {
      return NextResponse.json(
        { success: false, error: "企业抬头需提供纳税人识别号" },
        { status: 400 }
      )
    }

    if (invoice_type === "special" && (!bank_name?.trim() || !bank_account?.trim())) {
      return NextResponse.json(
        { success: false, error: "增值税专用发票需提供开户行和银行账号" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "服务器配置错误" },
        { status: 500 }
      )
    }

    // 验证订单存在、属于该餐厅、已完成、且未开过票
    const { data: order, error: orderError } = await supabase
      .from("order_main")
      .select("id, order_number, order_type, total_amount, status")
      .eq("id", order_main_id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: "订单不存在或无权操作" },
        { status: 404 }
      )
    }

    if (order.status !== "completed" && order.status !== "paid") {
      return NextResponse.json(
        { success: false, error: "仅支持对已完成/已支付订单申请开票" },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("order_main_id", order_main_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, error: "该订单已申请过发票" },
        { status: 400 }
      )
    }

    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        order_main_id,
        restaurant_id: restaurantId,
        invoice_type: invoice_type === "special" ? "special" : "normal",
        title_type: title_type === "personal" ? "personal" : "enterprise",
        company_name: company_name.trim(),
        tax_id: tax_id?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        bank_name: bank_name?.trim() || null,
        bank_account: bank_account?.trim() || null,
        email: email?.trim() || null,
        amount: order.total_amount,
        status: "pending",
      })
      .select("id, order_main_id, company_name, amount, status, created_at")
      .single()

    if (insertError) {
      console.error("[发票API] 创建失败:", insertError)
      return NextResponse.json(
        { success: false, error: "申请失败", details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "发票申请已提交，工作人员将在 1-3 个工作日内处理",
      data: invoice,
    })
  } catch (err: any) {
    console.error("[发票API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

async function resolveRestaurantId(request: NextRequest): Promise<string | null> {
  const clientRestaurantId = request.headers.get("x-restaurant-id")?.trim()
  if (clientRestaurantId) return clientRestaurantId

  const userContext = await getUserContext(request)
  if (!userContext) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !key) return null

  const supabase = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("user_id", userContext.userId)
    .limit(1)
    .maybeSingle()

  return data?.id || null
}

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !key) return null
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
