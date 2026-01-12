// ACCESS_LEVEL: SYSTEM_LEVEL
// ALLOWED_ROLES: super_admin
// CURRENT_KEY: Service Role Key
// TARGET_KEY: Service Role Key (系统级操作，必须保留)
// 说明：只能由 super_admin 调用，允许使用 Service Role Key

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * POST: 创建供应商公司
 * 注意：此 API 需要 super_admin 权限，使用 Service Role Key 仅用于创建公司记录
 * 创建后会自动为当前用户创建 user_companies 关联，确保多租户隔离
 */
export async function POST(request: Request) {
  try {
    // 第一步：使用统一用户上下文获取用户身份和权限
    let userContext
    try {
      userContext = await getUserContext(request)
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      
      if (errorMessage.includes("未登录")) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录管理员账号",
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: errorMessage,
        },
        { status: 403 }
      )
    }

    // 明确要求：role === 'super_admin'
    if (userContext.role !== "super_admin") {
      console.error("[创建公司API] 用户不是超级管理员:", userContext.userId, userContext.role)
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "只有超级管理员可以创建公司",
        },
        { status: 403 }
      )
    }

    console.log("[创建公司API] 用户验证通过:", userContext.userId, "角色:", userContext.role)

    // 第二步：使用 Service Role Key 创建 Supabase 客户端
    // 注意：创建公司需要 Service Role Key，因为需要绕过 RLS 创建记录
    // 但创建后会自动为当前用户创建关联，确保多租户隔离
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error("[创建公司API] Service Role Key 未配置")
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "SUPABASE_SERVICE_ROLE_KEY 未配置，无法创建公司",
          hint: "请在环境变量中配置 SUPABASE_SERVICE_ROLE_KEY，并重启开发服务器",
        },
        { status: 500 }
      )
    }

    // 使用 Service Role Key 创建管理员客户端（用于创建公司记录）
    const adminSupabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const body = await request.json()
    const {
      name,
      contact_name,
      contact_phone,
      contact_email,
      address,
      business_license,
      status = "active",
      user_id, // 前端传递的用户ID（用于自动创建关联记录）
    } = body

    // 验证必需字段
    if (!name || !name.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "公司名称不能为空",
        },
        { status: 400 }
      )
    }

    // 构建插入数据（字段名与数据库完全匹配）
    const insertData: any = {
      name: name.trim(),
      status: status || "active",
    }

    // 可选字段（只有在值存在时才添加）
    if (contact_name && contact_name.trim()) {
      insertData.contact_name = contact_name.trim()
    }
    if (contact_phone && contact_phone.trim()) {
      insertData.contact_phone = contact_phone.trim()
    }
    if (contact_email && contact_email.trim()) {
      insertData.contact_email = contact_email.trim()
    }
    if (address && address.trim()) {
      insertData.address = address.trim()
    }
    if (business_license && business_license.trim()) {
      insertData.business_license = business_license.trim()
    }

    // 插入数据（使用管理员客户端）
    const { data: companyData, error: insertError } = await adminSupabaseClient
      .from("companies")
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error("[创建公司API] 插入失败:", insertError)
      return NextResponse.json(
        {
          success: false,
          error: "创建公司失败",
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
        },
        { status: 500 }
      )
    }

    // 创建成功后，自动为当前登录的管理员创建 user_companies 关联记录
    // 使用已验证的当前用户ID（从 userContext 获取）
    const currentUserId = userContext.userId

    if (currentUserId && companyData) {
      try {
        // 写入操作：先检查是否已经有关联记录
        const { data: existing } = await adminSupabaseClient
          .from("user_companies")
          .select("id")
          .eq("user_id", currentUserId)
          .eq("company_id", companyData.id)
          .single()

        if (!existing) {
          // 如果设置为主公司，先取消其他主公司标记
          await adminSupabaseClient
            .from("user_companies")
            .update({ is_primary: false })
            .eq("user_id", currentUserId)

          // 创建关联记录（设为所有者，并设为主公司）
          const { error: linkError } = await adminSupabaseClient
            .from("user_companies")
            .insert({
              user_id: currentUserId,
              company_id: companyData.id,
              role: "owner",
              is_primary: true,
            })

          if (linkError) {
            console.warn("[创建公司API] 创建用户关联失败:", linkError)
            // 不阻止返回成功，因为公司已创建
          } else {
            console.log("[创建公司API] 已自动为管理员创建用户关联记录:", currentUserId)
          }
        } else {
          console.log("[创建公司API] 用户关联记录已存在")
        }
      } catch (linkErr) {
        console.warn("[创建公司API] 创建用户关联异常:", linkErr)
        // 不阻止返回成功，因为公司已创建
      }
    }

    const data = companyData

    return NextResponse.json({
      success: true,
      data,
      message: "公司创建成功",
    })
  } catch (err: any) {
    console.error("[创建公司API] 错误:", err)
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

