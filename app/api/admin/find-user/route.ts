// ACCESS_LEVEL: SYSTEM_LEVEL
// ALLOWED_ROLES: super_admin
// CURRENT_KEY: Service Role Key
// TARGET_KEY: Service Role Key (访问 auth.users 表，必须保留)
// 说明：只能由 super_admin 调用，访问 auth.users 表必须使用 Service Role Key

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST: 通过邮箱查找用户ID
 * 注意：此 API 需要访问 auth.users 表，必须使用 Service Role Key
 * 这是 Supabase 的限制，普通 Anon Key 无法访问 auth.users
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
    // 注意：这是唯一访问 auth.users 表的方式，Supabase 不允许使用 Anon Key 访问
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少邮箱参数",
        },
        { status: 400 }
      )
    }

    // 通过邮箱查找用户（使用 Admin API）
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error("[查找用户API] 查询失败:", error)
      return NextResponse.json(
        {
          success: false,
          error: "查询用户失败",
          details: error.message,
        },
        { status: 500 }
      )
    }

    // 在用户列表中查找匹配的邮箱
    const user = users?.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "用户不存在",
          details: `未找到邮箱为 ${email} 的用户`,
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      userMetadata: user.user_metadata,
    })
  } catch (err: any) {
    console.error("[查找用户API] 错误:", err)
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


