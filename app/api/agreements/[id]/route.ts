/**
 * 协议管理 API - 单个协议操作
 * 
 * GET /api/agreements/[id] - 获取单个协议
 * PUT /api/agreements/[id] - 更新协议
 * DELETE /api/agreements/[id] - 删除协议
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 权限验证：确保用户已登录
    const userContext = await getUserContext(request)
    
    if (!userContext) {
      return NextResponse.json(
        {
          success: false,
          error: "未授权",
          details: "请先登录",
        },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const keyToUse = serviceRoleKey || anonKey
    
    if (!supabaseUrl || !keyToUse) {
      console.error("[协议管理API] Supabase URL 或密钥未配置")
      return NextResponse.json(
        { 
          success: false,
          error: "数据库配置错误",
          details: "缺少 Supabase 环境变量配置"
        },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { id } = await params

    const { data, error } = await supabaseClient
      .from("agreements")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { 
            success: false,
            error: "协议不存在" 
          },
          { status: 404 }
        )
      }
      console.error("[协议管理API] 查询失败:", error)
      // 如果表不存在，返回 404
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            success: false,
            error: "协议不存在",
            details: "agreements 表不存在，请先执行数据库迁移脚本"
          },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { 
          success: false,
          error: "查询协议失败", 
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("[协议管理API] 错误:", error)
    return NextResponse.json(
      { error: "服务器错误", details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 权限验证：确保用户已登录且是管理员
    const userContext = await getUserContext(request)
    
    if (!userContext) {
      return NextResponse.json(
        {
          success: false,
          error: "未授权",
          details: "请先登录",
        },
        { status: 401 }
      )
    }

    // 检查是否是管理员
    if (userContext.role !== "super_admin" && userContext.role !== "platform_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "仅管理员可更新协议",
        },
        { status: 403 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const keyToUse = serviceRoleKey || anonKey
    
    if (!supabaseUrl || !keyToUse) {
      console.error("[协议管理API] Supabase URL 或密钥未配置")
      return NextResponse.json(
        { 
          success: false,
          error: "数据库配置错误",
          details: "缺少 Supabase 环境变量配置"
        },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { id } = await params
    const body = await request.json()
    const {
      title,
      type,
      version,
      content,
      content_html,
      status,
      is_active,
      effective_date,
      expiry_date,
      description,
      updated_by,
    } = body

    // 如果要设置为active，需要先取消同类型其他协议的active状态
    if (is_active && status === "published") {
      // 先获取当前协议的类型
      const { data: currentAgreement } = await supabaseClient
        .from("agreements")
        .select("type")
        .eq("id", id)
        .single()

      if (currentAgreement) {
        const { error: deactivateError } = await supabaseClient
          .from("agreements")
          .update({ is_active: false })
          .eq("type", currentAgreement.type)
          .eq("is_active", true)
          .neq("id", id)

        if (deactivateError) {
          console.error("[协议管理API] 取消其他协议active状态失败:", deactivateError)
        }
      }
    }

    // 更新协议
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (type !== undefined) updateData.type = type
    if (version !== undefined) updateData.version = version
    if (content !== undefined) updateData.content = content
    if (content_html !== undefined) updateData.content_html = content_html
    if (status !== undefined) updateData.status = status
    if (is_active !== undefined) updateData.is_active = is_active
    if (effective_date !== undefined) updateData.effective_date = effective_date
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date
    if (description !== undefined) updateData.description = description
    if (updated_by !== undefined) updateData.updated_by = updated_by

    const { data, error } = await supabaseClient
      .from("agreements")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[协议管理API] 更新失败:", error)
      // 如果表不存在，提示用户执行迁移脚本
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            success: false,
            error: "更新协议失败", 
            details: "agreements 表不存在，请先执行数据库迁移脚本：migrations/20250121_agreements_table.sql"
          },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { 
          success: false,
          error: "更新协议失败", 
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("[协议管理API] 错误:", error)
    return NextResponse.json(
      { error: "服务器错误", details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 权限验证：确保用户已登录且是管理员
    const userContext = await getUserContext(request)
    
    if (!userContext) {
      return NextResponse.json(
        {
          success: false,
          error: "未授权",
          details: "请先登录",
        },
        { status: 401 }
      )
    }

    // 检查是否是管理员
    if (userContext.role !== "super_admin" && userContext.role !== "platform_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "仅管理员可删除协议",
        },
        { status: 403 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const keyToUse = serviceRoleKey || anonKey
    
    if (!supabaseUrl || !keyToUse) {
      console.error("[协议管理API] Supabase URL 或密钥未配置")
      return NextResponse.json(
        { 
          success: false,
          error: "数据库配置错误",
          details: "缺少 Supabase 环境变量配置"
        },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { id } = await params

    const { error } = await supabaseClient
      .from("agreements")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[协议管理API] 删除失败:", error)
      // 如果表不存在，提示用户执行迁移脚本
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            success: false,
            error: "删除协议失败", 
            details: "agreements 表不存在，请先执行数据库迁移脚本：migrations/20250121_agreements_table.sql"
          },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { 
          success: false,
          error: "删除协议失败", 
          details: error.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "协议已删除",
    })
  } catch (error: any) {
    console.error("[协议管理API] 错误:", error)
    return NextResponse.json(
      { error: "服务器错误", details: error.message },
      { status: 500 }
    )
  }
}
