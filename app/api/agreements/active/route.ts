/**
 * GET /api/agreements/active?type=rental
 * 获取当前生效的协议（仅读）。type=rental 时不要求登录，供客户端确认租赁时展示租赁协议。
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    if (!type) {
      return NextResponse.json(
        { success: false, error: "缺少参数 type" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const keyToUse = serviceRoleKey || anonKey

    if (!supabaseUrl || !keyToUse) {
      return NextResponse.json(
        { success: false, error: "数据库配置错误" },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 查询该类型下当前生效的协议：优先平台通用（company_id IS NULL）
    const { data: rows, error } = await supabaseClient
      .from("agreements")
      .select("id, title, type, version, content, content_html, effective_date, expiry_date")
      .eq("type", type)
      .eq("is_active", true)
      .eq("status", "published")
      .is("company_id", null)
      .order("effective_date", { ascending: false, nullsFirst: false })
      .limit(1)

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ success: true, data: null })
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const agreement = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    return NextResponse.json({ success: true, data: agreement })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "服务器错误" },
      { status: 500 }
    )
  }
}
