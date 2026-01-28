// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff, super_admin
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：获取订单主表列表（统一管理燃料订单和租赁订单）

import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取订单主表列表
 * 查询参数：
 * - order_type: 订单类型筛选（可选）：'fuel'（燃料订单）、'rental'（租赁订单）
 * - status: 订单状态筛选（可选）
 * - restaurant_id: 餐厅ID筛选（可选）
 * - page: 页码（可选，默认：1）
 * - page_size: 每页数量（可选，默认：20）
 */
export async function GET(request: NextRequest) {
  try {
    // P0修复：强制使用统一用户上下文获取用户身份和权限
    let userContext
    let clientRestaurantId: string | null = null
    
    try {
      userContext = await getUserContext(request)
      
      // 如果 getUserContext 失败，尝试客户端用户认证（通过 x-restaurant-id 请求头）
      if (!userContext) {
        clientRestaurantId = request.headers.get("x-restaurant-id")
        if (clientRestaurantId && clientRestaurantId.trim() !== "") {
          console.log("[订单主表API] 使用客户端用户认证，restaurant_id:", clientRestaurantId)
          // 客户端用户认证成功，继续处理
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "未授权",
              details: "请先登录",
              data: [],
            },
            { status: 401 }
          )
        }
      } else {
        if (userContext.role === "super_admin") {
          console.log("[订单主表API] Super Admin 访问，跳过多租户过滤")
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      
      // 如果 getUserContext 失败，尝试客户端用户认证
      if (errorMessage.includes("未登录") || !userContext) {
        clientRestaurantId = request.headers.get("x-restaurant-id")
        if (clientRestaurantId && clientRestaurantId.trim() !== "") {
          console.log("[订单主表API] getUserContext 失败，使用客户端用户认证，restaurant_id:", clientRestaurantId)
          // 客户端用户认证成功，继续处理
        } else {
          return NextResponse.json(
            {
              success: false,
              error: "未授权",
              details: "请先登录",
              data: [],
            },
            { status: 401 }
          )
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "权限不足",
            details: errorMessage,
            data: [],
          },
          { status: 403 }
        )
      }
    }

    // P0修复：强制验证 companyId（super_admin 和客户端用户除外）
    if (userContext && !userContext.companyId && userContext.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "用户未关联任何公司",
          data: [],
        },
        { status: 403 }
      )
    }


    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置",
          data: [],
        },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey || anonKey!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const { searchParams } = new URL(request.url)
    const orderType = searchParams.get("order_type")
    const status = searchParams.get("status")
    const restaurantId = searchParams.get("restaurant_id")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("page_size") || "20")

    // 构建查询（不使用关联查询，避免 Supabase 无法识别外键关系）
    let query = supabaseClient
      .from("order_main")
      .select("*", { count: "exact" })

    // 订单类型筛选
    if (orderType && (orderType === "fuel" || orderType === "rental")) {
      query = query.eq("order_type", orderType)
    }

    // 状态筛选
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    // 餐厅筛选
    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId)
    }

    // 🔒 多租户隔离：按 company_id 或 restaurant_id 过滤
    if (clientRestaurantId) {
      // 客户端用户：只能查看自己餐厅的订单
      query = query.eq("restaurant_id", clientRestaurantId)
      console.log("[订单主表API] 客户端用户，应用餐厅过滤，restaurant_id:", clientRestaurantId)
      console.log("[订单主表API] 查询条件: restaurant_id =", clientRestaurantId)
    } else if (userContext && userContext.role === "super_admin") {
      console.log("[订单主表API] Super Admin 访问，不应用多租户过滤")
      // Super Admin 可以查看所有数据，不添加过滤条件
    } else if (userContext && userContext.companyId) {
      // 普通用户：只能查看自己公司的订单和平台通用订单
      query = query.or(`company_id.eq.${userContext.companyId},company_id.is.null`)
      console.log("[订单主表API] 应用多租户过滤，company_id:", userContext.companyId)
    } else if (userContext) {
      // 如果没有 company_id，只能查看平台通用订单
      query = query.is("company_id", null)
      console.warn("[订单主表API] ⚠️ 用户没有 company_id，仅显示平台通用订单")
    }

    // 排序和分页
    query = query.order("created_at", { ascending: false })
    query = query.range((page - 1) * pageSize, page * pageSize - 1)

    const { data: orders, error, count } = await query

    if (error) {
      console.error("[订单主表API] 查询失败:", error)
      return NextResponse.json(
        {
          success: false,
          error: "查询订单失败",
          details: error.message,
          data: [],
        },
        { status: 500 }
      )
    }

    // 收集所有需要查询的 restaurant_id
    const restaurantIds = [...new Set(
      (orders || [])
        .map((order: any) => order.restaurant_id)
        .filter((id: any) => id !== null && id !== undefined)
    )]

    // 批量查询餐厅信息
    let restaurantsMap: Record<string, any> = {}
    if (restaurantIds.length > 0) {
      const { data: restaurantsData, error: restaurantsError } = await supabaseClient
        .from("restaurants")
        .select("id, name, contact_name, contact_phone")
        .in("id", restaurantIds)

      if (!restaurantsError && restaurantsData) {
        restaurantsMap = restaurantsData.reduce((acc: Record<string, any>, restaurant: any) => {
          acc[restaurant.id] = restaurant
          return acc
        }, {})
      }
    }

    // 🛡️ 数据安全处理：确保所有字段都有默认值，避免空值导致前端错误
    const safeOrders = (orders || []).map((order: any) => {
      const restaurant = order.restaurant_id ? restaurantsMap[order.restaurant_id] : null
      
      return {
        id: order.id || '',
        order_number: order.order_number || '未知订单号',
        order_type: order.order_type || 'unknown',
        company_id: order.company_id || null,
        status: order.status || 'pending',
        total_amount: order.total_amount || 0,
        created_at: order.created_at || new Date().toISOString(),
        updated_at: order.updated_at || order.created_at || new Date().toISOString(),
        fuel_order_id: order.fuel_order_id || null,
        rental_order_id: order.rental_order_id || null,
        restaurant_id: order.restaurant_id || null,
        user_id: order.user_id || null,
        notes: order.notes || null,
        restaurants: restaurant ? {
          id: restaurant.id || '',
          name: restaurant.name || '未知餐厅',
          contact_name: restaurant.contact_name || null,
          contact_phone: restaurant.contact_phone || null,
        } : null,
      }
    })

    console.log(`[订单主表API] ✅ 查询成功，返回 ${safeOrders.length} 条订单`)

    return NextResponse.json({
      success: true,
      data: safeOrders,
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    })
  } catch (err: any) {
    console.error("[订单主表API] 错误:", err)
    return NextResponse.json(
      {
        success: false,
        error: "服务器错误",
        details: err.message,
        data: [],
      },
      { status: 500 }
    )
  }
}
