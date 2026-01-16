/**
 * 协议管理 API
 * 
 * GET /api/agreements - 获取协议列表
 * POST /api/agreements - 创建新协议
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const activeOnly = searchParams.get("active_only") === "true"

    let query = supabaseClient
      .from("agreements")
      .select("*")
      .order("created_at", { ascending: false })

    // 类型筛选
    if (type) {
      query = query.eq("type", type)
    }

    // 状态筛选
    if (status) {
      query = query.eq("status", status)
    }

    // 只获取生效版本
    if (activeOnly) {
      query = query.eq("is_active", true).eq("status", "published")
    }

    const { data, error } = await query

    if (error) {
      console.error("[协议管理API] 查询失败:", error)
      return NextResponse.json(
        { error: "查询协议失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error: any) {
    console.error("[协议管理API] 错误:", error)
    return NextResponse.json(
      { error: "服务器错误", details: error.message },
      { status: 500 }
    )
  }
}

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
    const {
      title,
      type,
      version,
      content,
      content_html,
      status = "draft",
      is_active = false,
      effective_date,
      expiry_date,
      description,
      created_by,
    } = body

    // 验证必需字段
    if (!title || !type || !content) {
      return NextResponse.json(
        { error: "缺少必需字段：title, type, content" },
        { status: 400 }
      )
    }

    // 如果要设置为active，需要先取消同类型其他协议的active状态
    if (is_active && status === "published") {
      const { error: deactivateError } = await supabaseClient
        .from("agreements")
        .update({ is_active: false })
        .eq("type", type)
        .eq("is_active", true)

      if (deactivateError) {
        console.error("[协议管理API] 取消其他协议active状态失败:", deactivateError)
      }
    }

    // 创建新协议
    const { data, error } = await supabaseClient
      .from("agreements")
      .insert({
        title,
        type,
        version: version || "1.0",
        content,
        content_html,
        status,
        is_active,
        effective_date,
        expiry_date,
        description,
        created_by,
      })
      .select()
      .single()

    if (error) {
      console.error("[协议管理API] 创建失败:", error)
      return NextResponse.json(
        { error: "创建协议失败", details: error.message },
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
