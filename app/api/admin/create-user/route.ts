// ACCESS_LEVEL: SYSTEM_LEVEL
// ALLOWED_ROLES: super_admin
// CURRENT_KEY: Service Role Key
// TARGET_KEY: Service Role Key (访问 auth.users 表，必须保留)
// 说明：只能由 super_admin 调用，创建用户必须使用 Service Role Key

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST: 创建新用户（如果不存在）
 * 注意：此 API 需要访问 auth.users 表，必须使用 Service Role Key
 * 默认密码：123456
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
          details: "缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量。创建用户需要 Service Role Key",
        },
        { status: 500 }
      )
    }

    // 使用 Service Role Key 创建 Admin 客户端
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const body = await request.json()
    const { email, password = "123456" } = body

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少邮箱参数",
        },
        { status: 400 }
      )
    }

    // 先检查用户是否已存在
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error("[创建用户API] 查询用户列表失败:", listError)
      return NextResponse.json(
        {
          success: false,
          error: "查询用户失败",
          details: listError.message,
        },
        { status: 500 }
      )
    }

    // 检查用户是否已存在
    const existingUser = users?.find((u) => u.email === email)

    if (existingUser) {
      // 检查用户是否已有角色，如果没有则自动分配
      const { data: existingRole, error: roleCheckError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", existingUser.id)
        .maybeSingle()

      if (roleCheckError && roleCheckError.code !== 'PGRST116') {
        // PGRST116 是"未找到记录"的错误，这是正常的
        console.warn("[创建用户API] 检查用户角色时出错:", roleCheckError)
      }

      // 如果用户没有角色，自动分配 admin 角色
      if (!existingRole) {
        const { error: roleInsertError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: existingUser.id,
            role: "company_admin",
          })

        if (roleInsertError) {
          console.error("[创建用户API] 为已存在用户分配角色失败:", roleInsertError)
        } else {
          console.log(`[创建用户API] 为已存在用户自动分配 admin 角色: ${existingUser.email}`)
        }
      }

      return NextResponse.json({
        success: true,
        userId: existingUser.id,
        email: existingUser.email,
        isNewUser: false,
        message: "用户已存在",
      })
    }

    // 创建新用户
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // 自动确认邮箱，用户可以直接登录
      user_metadata: {
        is_default_password: true, // 标记为使用默认密码
        created_by_admin: true, // 标记为管理员创建
      },
    })

    if (createError) {
      console.error("[创建用户API] 创建用户失败:", createError)
      return NextResponse.json(
        {
          success: false,
          error: "创建用户失败",
          details: createError.message,
        },
        { status: 500 }
      )
    }

    if (!newUser.user) {
      return NextResponse.json(
        {
          success: false,
          error: "创建用户失败",
          details: "未返回用户信息",
        },
        { status: 500 }
      )
    }

    // 自动为新创建的用户分配 admin 角色
    // 因为是通过供应商管理创建的，应该是管理员
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "company_admin", // 分配公司管理员角色
      })

    if (roleError) {
      console.error("[创建用户API] 分配角色失败:", roleError)
      // 即使角色分配失败，也返回成功（用户已创建）
      // 但记录错误，管理员可以手动分配角色
      return NextResponse.json({
        success: true,
        userId: newUser.user.id,
        email: newUser.user.email,
        isNewUser: true,
        message: "用户创建成功，默认密码：123456。但角色分配失败，请手动分配角色。",
        warning: "角色分配失败，请手动在数据库中为该用户分配角色",
        roleError: roleError.message,
      })
    }

    console.log(`[创建用户API] 用户创建成功并已分配 admin 角色: ${newUser.user.email}`)

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      email: newUser.user.email,
      isNewUser: true,
      message: "用户创建成功，默认密码：123456，已自动分配管理员角色",
    })
  } catch (err: any) {
    console.error("[创建用户API] 错误:", err)
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
