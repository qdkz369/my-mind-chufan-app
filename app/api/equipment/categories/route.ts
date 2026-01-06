import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * GET: 获取设备分类列表
 */
export async function GET() {
  try {
    // 使用 service role key 绕过 RLS，允许公开查询设备分类
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gjlhcpfvjgqabqanvgmu.supabase.co"
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!serviceRoleKey) {
      console.error("[设备分类API] SUPABASE_SERVICE_ROLE_KEY 未配置")
      return NextResponse.json(
        { error: "服务器配置错误", details: "SUPABASE_SERVICE_ROLE_KEY 未配置" },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data: categories, error } = await supabaseClient
      .from("equipment_categories")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) {
      console.error("[设备分类API] 查询失败:", error)
      return NextResponse.json(
        { error: "获取设备分类失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
    })
  } catch (err: any) {
    console.error("[设备分类API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

