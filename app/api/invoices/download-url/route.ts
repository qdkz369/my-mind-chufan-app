// 客户端发票下载 URL
// 鉴权：x-restaurant-id 或 getUserContext，仅该订单客户可获取

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

const EXPIRY_SECONDS = 3600 // 1 小时

export async function GET(request: NextRequest) {
  try {
    const invoiceId = request.nextUrl.searchParams.get("invoice_id")
    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "缺少 invoice_id" },
        { status: 400 }
      )
    }

    const restaurantId = request.headers.get("x-restaurant-id")?.trim()
    let userRestaurantId: string | null = restaurantId || null

    if (!userRestaurantId) {
      const userContext = await getUserContext(request)
      if (userContext) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (supabaseUrl && key) {
          const supabase = createClient(supabaseUrl, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
          const { data } = await supabase
            .from("restaurants")
            .select("id")
            .eq("user_id", userContext.userId)
            .limit(1)
            .maybeSingle()
          userRestaurantId = data?.id || null
        }
      }
    }

    if (!userRestaurantId) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
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

    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .select("id, restaurant_id, invoice_file_url, status")
      .eq("id", invoiceId)
      .maybeSingle()

    if (invErr || !inv) {
      return NextResponse.json(
        { success: false, error: "发票不存在" },
        { status: 404 }
      )
    }

    if (inv.restaurant_id !== userRestaurantId) {
      return NextResponse.json(
        { success: false, error: "无权访问该发票" },
        { status: 403 }
      )
    }

    if (!inv.invoice_file_url?.trim()) {
      return NextResponse.json(
        { success: false, error: "该发票暂无电子文件" },
        { status: 404 }
      )
    }

    const url = inv.invoice_file_url
    if (url.startsWith("http")) {
      return NextResponse.json({
        success: true,
        data: { url, expires_in: null },
      })
    }

    const { data: signed } = await supabase.storage
      .from("invoice-files")
      .createSignedUrl(url, EXPIRY_SECONDS)

    if (signed?.signedUrl) {
      return NextResponse.json({
        success: true,
        data: { url: signed.signedUrl, expires_in: EXPIRY_SECONDS },
      })
    }

    return NextResponse.json({
      success: false,
      error: "获取下载链接失败",
    }, { status: 500 })
  } catch (err: any) {
    console.error("[发票下载URL] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
