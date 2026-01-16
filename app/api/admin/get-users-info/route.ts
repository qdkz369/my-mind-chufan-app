// ACCESS_LEVEL: SYSTEM_LEVEL
// ALLOWED_ROLES: super_admin
// CURRENT_KEY: Service Role Key
// TARGET_KEY: Service Role Key (访问 auth.users 表，必须保留)
// 说明：只能由 super_admin 调用，访问 auth.users 表必须使用 Service Role Key

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST: 批量获取用户信息（邮箱、手机号等）
 * 注意：此 API 需要访问 auth.users 表，必须使用 Service Role Key
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "缺少 NEXT_PUBLIC_SUPABASE_URL 环境变量",
        },
        { status: 500 }
      )
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量。访问 auth.users 表需要 Service Role Key",
        },
        { status: 500 }
      )
    }

    // 使用 Service Role Key 创建 Admin 客户端（可以访问 auth.users）
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const body = await request.json()
    const { userIds } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少用户ID列表",
        },
        { status: 400 }
      )
    }

    // 获取所有用户（使用 Admin API）
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error("[获取用户信息API] 查询失败:", error)
      return NextResponse.json(
        {
          success: false,
          error: "查询用户失败",
          details: error.message,
        },
        { status: 500 }
      )
    }

    // 过滤出匹配的用户
    const matchedUsers = users?.filter((u) => userIds.includes(u.id)) || []

    // 构建返回数据：{ userId: { email, phone } }
    const usersInfo: Record<string, { email?: string; phone?: string }> = {}
    
    matchedUsers.forEach((user) => {
      usersInfo[user.id] = {
        email: user.email,
        phone: user.phone || user.user_metadata?.phone || undefined,
      }
    })

    return NextResponse.json({
      success: true,
      users: usersInfo,
    })
  } catch (err: any) {
    console.error("[获取用户信息API] 错误:", err)
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
        details: err.message,
      },
      { status: 500 }
    )
  }
}
