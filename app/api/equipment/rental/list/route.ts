// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先) 或 Anon Key
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，已接入 getUserContext，必须强制 company_id 过滤，后续必须迁移到 Anon Key + RLS

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { enforceCompanyFilter } from "@/lib/multi-tenant"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取租赁订单列表
 * 查询参数：
 * - restaurant_id: 餐厅ID（必需）
 * - user_id: 用户ID（可选，用于RLS）
 * - status: 订单状态筛选（可选）
 */
export async function GET(request: Request) {
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
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      
      // 如果 companyId 不存在（非 super_admin），直接返回 403
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: errorMessage,
        },
        { status: 403 }
      )
    }

    // 使用返回的 companyId 作为唯一租户过滤条件
    // super_admin 允许 companyId 为 undefined，但普通用户必须有 companyId
    if (!userContext.companyId && userContext.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "用户未关联任何公司",
        },
        { status: 403 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // 优先使用 service role key，如果没有则使用 anon key（需要 RLS 策略允许）
    const keyToUse = serviceRoleKey || anonKey
    
    if (!supabaseUrl || !keyToUse) {
      console.error("[租赁订单列表API] Supabase URL 或密钥未配置")
      return NextResponse.json(
        { 
          success: true, 
          data: [],
          warning: "未配置 Supabase 密钥，返回空列表"
        },
        { status: 200 }
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
    const status = searchParams.get("status")
    // 使用 userContext 中的 companyId 作为唯一租户过滤条件
    const companyId = userContext.companyId

    if (!restaurantId) {
      return NextResponse.json(
        { 
          success: true,
          data: [],
          error: "缺少 restaurant_id 参数" 
        },
        { status: 200 } // 返回 200 避免前端崩溃
      )
    }

    let query = supabaseClient
      .from("rental_orders")
      .select(`
        *,
        equipment (
          id,
          name,
          brand,
          model,
          images,
          equipment_categories (
            id,
            name,
            icon
          )
        )
      `)
      .eq("restaurant_id", restaurantId)

    // 🔒 多租户隔离：强制按 provider_id 过滤（super_admin 除外）
    if (companyId) {
      query = enforceCompanyFilter(query, companyId, "provider_id")
      console.log("[租赁订单列表API] 应用多租户过滤，company_id:", companyId)
    } else if (userContext.role === "super_admin") {
      // super_admin 可以查看所有数据，不应用 company_id 过滤
      console.log("[租赁订单列表API] 超级管理员，不应用多租户过滤")
    } else {
      // 非 super_admin 且没有 companyId，应该已经在前面返回 403
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "用户未关联任何公司",
        },
        { status: 403 }
      )
    }

    // 用户ID筛选（如果提供）
    if (userId) {
      query = query.eq("user_id", userId)
    }

    // 状态筛选
    if (status) {
      query = query.eq("order_status", status)
    }

    query = query.order("created_at", { ascending: false })

    const { data: orders, error } = await query

    if (error) {
      // 如果是表不存在的错误，返回空数组而不是错误
      if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
        console.warn("[租赁订单列表API] 表不存在，返回空列表:", error.message)
        return NextResponse.json({
          success: true,
          data: [],
          warning: "租赁订单表不存在，请先运行数据库迁移脚本"
        })
      }
      
      console.error("[租赁订单列表API] 查询失败:", error)
      // 即使查询失败，也返回空数组，避免前端崩溃
      return NextResponse.json({
        success: true,
        data: [],
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
    })
  } catch (err: any) {
    console.error("[租赁订单列表API] 错误:", err)
    // 捕获所有错误，返回空数组而不是错误，确保前端不会崩溃
    return NextResponse.json({
      success: true,
      data: [],
      error: err.message
    })
  }
}


