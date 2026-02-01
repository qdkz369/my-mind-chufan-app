// 管理端发票下载 URL
// 鉴权：getUserContext，供应商管理员可获取

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

const EXPIRY_SECONDS = 3600

export async function GET(
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
      .select("id, restaurant_id, invoice_file_url")
      .eq("id", id)
      .maybeSingle()

    if (invErr || !inv) {
      return NextResponse.json(
        { success: false, error: "发票不存在" },
        { status: 404 }
      )
    }

    if (userContext.role !== "super_admin" && userContext.companyId) {
      const { data: rest } = await supabase
        .from("restaurants")
        .select("company_id")
        .eq("id", inv.restaurant_id)
        .maybeSingle()
      if (!rest || rest.company_id !== userContext.companyId) {
        return NextResponse.json(
          { success: false, error: "无权访问该发票" },
          { status: 403 }
        )
      }
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
    console.error("[管理端发票下载] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
