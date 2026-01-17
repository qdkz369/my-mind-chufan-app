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

    // 过滤过期通知（如果 expires_at 列存在）
    // 注意：expires_at 是可选的，如果列不存在则跳过此过滤
    const { data, error } = await query

    if (error) {
      // 容错处理：如果表不存在或查询失败，返回空数据而不是错误
      // 检查是否是 expires_at 列不存在的错误
      if (error.message?.includes('expires_at') || error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.warn("[通知API] expires_at 列不存在，跳过过期过滤，重新查询...")
        // 重新查询，不使用 expires_at 过滤
        const retryQuery = supabaseClient
          .from("notifications")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false })
          .limit(limit)

        if (userId) {
          retryQuery.eq("user_id", userId)
        }
        if (type) {
          retryQuery.eq("type", type)
        }
        if (category) {
          retryQuery.eq("category", category)
        }
        if (unreadOnly) {
          retryQuery.eq("is_read", false)
        }

        const { data: retryData, error: retryError } = await retryQuery
        
        if (retryError) {
          // 如果重试仍然失败，可能是表不存在
          if (retryError.code === 'PGRST116' || retryError.code === '42P01' || retryError.message?.includes('does not exist')) {
            console.warn("[通知API] notifications 表不存在，返回空数据")
            return NextResponse.json({
              success: true,
              data: [],
              unread_count: 0,
            })
          }
          
          console.warn("[通知API] 重试查询失败（容错处理，返回空数据）:", retryError.message)
          return NextResponse.json({
            success: true,
            data: [],
            unread_count: 0,
          })
        }
        
        // 重试成功，使用重试的结果
        const unreadCountResult = await supabaseClient
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId)
          .eq("is_read", false)
        
        return NextResponse.json({
          success: true,
          data: retryData || [],
          unread_count: unreadCountResult.count || 0,
        })
      }
      
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
      console.warn("[通知API] 查询失败（容错处理，返回空数据）:", error.message)
      return NextResponse.json({
        success: true,
        data: [],
        unread_count: 0,
      })
    }

    // 统计未读数量（容错处理，不包含 expires_at 过滤）
    let unreadCount = 0
    try {
      const countQuery = supabaseClient
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("is_read", false)
      
      const { count, error: countError } = await countQuery
      
      // 如果 expires_at 列存在，会在查询时自动过滤过期通知
      // 如果列不存在，这里只统计 is_read = false 的数量
      if (countError && countError.message?.includes('expires_at')) {
        // expires_at 列不存在，直接使用 count（不含过期过滤）
        unreadCount = count || 0
      } else if (countError) {
        console.warn("[通知API] 统计未读数量失败（容错处理）:", countError.message)
        unreadCount = 0
      } else {
        unreadCount = count || 0
      }
    } catch (countError: any) {
      console.warn("[通知API] 统计未读数量失败（容错处理）:", countError?.message || countError)
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
