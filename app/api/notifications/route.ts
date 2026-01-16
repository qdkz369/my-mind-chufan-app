/**
 * 通知管理 API
 * 
 * GET /api/notifications - 获取通知列表
 * POST /api/notifications - 创建新通知（管理端使用）
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
    const restaurantId = searchParams.get("restaurant_id")
    const userId = searchParams.get("user_id")
    const type = searchParams.get("type")
    const category = searchParams.get("category")
    const unreadOnly = searchParams.get("unread_only") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!restaurantId) {
      // 如果没有 restaurant_id，返回空数据而不是错误（容错处理）
      return NextResponse.json({
        success: true,
        data: [],
        unread_count: 0,
      })
    }

    // 检查表是否存在，如果不存在则返回空数据（容错处理）
    // 注意：restaurant_id 可能是 UUID 或 TEXT 类型，需要兼容处理
    let query = supabaseClient
      .from("notifications")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(limit)

    // 用户筛选
    if (userId) {
      query = query.eq("user_id", userId)
    }

    // 类型筛选
    if (type) {
      query = query.eq("type", type)
    }

    // 分类筛选
    if (category) {
      query = query.eq("category", category)
    }

    // 只获取未读
    if (unreadOnly) {
      query = query.eq("is_read", false)
    }

    // 过滤过期通知
    query = query.or("expires_at.is.null,expires_at.gt." + new Date().toISOString())

    const { data, error } = await query

    if (error) {
      // 容错处理：如果表不存在或查询失败，返回空数据而不是错误
      console.warn("[通知API] 查询失败（容错处理，返回空数据）:", error.message)
      
      // 检查是否是表不存在的错误
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn("[通知API] notifications 表不存在，返回空数据")
        return NextResponse.json({
          success: true,
          data: [],
          unread_count: 0,
        })
      }
      
      // 其他错误也返回空数据，不阻断页面加载
      return NextResponse.json({
        success: true,
        data: [],
        unread_count: 0,
      })
    }

    // 统计未读数量（容错处理）
    let unreadCount = 0
    try {
      const { count } = await supabaseClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("is_read", false)
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      
      unreadCount = count || 0
    } catch (countError) {
      console.warn("[通知API] 统计未读数量失败（容错处理）:", countError)
      unreadCount = 0
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      unread_count: unreadCount,
    })
  } catch (error: any) {
    console.error("[通知API] 错误:", error)
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
      restaurant_id,
      user_id,
      title,
      content,
      type = "system",
      category,
      related_order_id,
      related_entity_type,
      related_entity_id,
      priority = "normal",
      action_url,
      action_label,
      sender_type = "system",
      sender_id,
      sender_name,
      expires_at,
    } = body

    // 验证必需字段
    if (!restaurant_id || !title || !content) {
      return NextResponse.json(
        { error: "缺少必需字段：restaurant_id, title, content" },
        { status: 400 }
      )
    }

    // 创建通知
    const { data, error } = await supabaseClient
      .from("notifications")
      .insert({
        restaurant_id,
        user_id,
        title,
        content,
        type,
        category,
        related_order_id,
        related_entity_type,
        related_entity_id,
        priority,
        action_url,
        action_label,
        sender_type,
        sender_id,
        sender_name,
        expires_at,
      })
      .select()
      .single()

    if (error) {
      console.error("[通知API] 创建失败:", error)
      return NextResponse.json(
        { error: "创建通知失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("[通知API] 错误:", error)
    return NextResponse.json(
      { error: "服务器错误", details: error.message },
      { status: 500 }
    )
  }
}
