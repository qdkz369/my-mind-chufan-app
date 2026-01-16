/**
 * 通知管理 API - 批量标记已读
 * 
 * POST /api/notifications/mark-all-read - 标记所有通知为已读
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const keyToUse = serviceRoleKey || anonKey
    
    if (!supabaseUrl || !keyToUse) {
      return NextResponse.json(
        { error: "数据库配置错误" },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const body = await request.json()
    const { restaurant_id, user_id } = body

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必需参数: restaurant_id" },
        { status: 400 }
      )
    }

    // 构建查询条件
    let query = supabaseClient
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("restaurant_id", restaurant_id)
      .eq("is_read", false)

    if (user_id) {
      query = query.eq("user_id", user_id)
    }

    const { error } = await query

    if (error) {
      console.error("[通知API] 批量标记已读失败:", error)
      return NextResponse.json(
        { error: "批量标记已读失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "所有通知已标记为已读",
    })
  } catch (error: any) {
    console.error("[通知API] 错误:", error)
    return NextResponse.json(
      { error: "服务器错误", details: error.message },
      { status: 500 }
    )
  }
}
