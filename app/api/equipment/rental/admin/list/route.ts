// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，后续必须迁移到 Anon Key + RLS

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentCompanyId, enforceCompanyFilter } from "@/lib/multi-tenant"

/**
 * GET: 获取所有设备租赁订单（管理端）
 * 查询参数：
 * - status: 订单状态筛选（可选）
 * - restaurant_id: 餐厅ID筛选（可选）
 * 
 * 注意：此 API 查询的是 rental_orders 表（设备租赁订单表）
 * 如果查询 rentals 表（租赁管理表），请使用不同的 API 端点
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      console.error("[设备租赁管理API] Supabase URL 或密钥未配置")
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置。请检查环境变量。",
          data: [],
        },
        { status: 500 }
      )
    }

    let supabaseClient: any

    if (serviceRoleKey) {
      // 优先使用 service role key 绕过 RLS
      supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      console.log("[设备租赁管理API] 使用服务角色密钥")
    } else if (anonKey) {
      // 降级使用 anon key
      supabaseClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      console.warn("[设备租赁管理API] SUPABASE_SERVICE_ROLE_KEY 未配置，降级使用匿名密钥")
    } else {
      console.error("[设备租赁管理API] 错误: 缺少 Supabase 配置 (服务角色密钥和匿名密钥均未配置)")
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置。请检查环境变量。",
          data: [],
        },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const restaurantId = searchParams.get("restaurant_id")
    const companyId = searchParams.get("company_id") || await getCurrentCompanyId(request) // 🔒 多租户隔离：供应商ID

    // 首先尝试查询 rental_orders 表，如果不存在则查询 rentals 表
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
          monthly_rental_price,
          deposit_amount,
          equipment_categories (
            id,
            name,
            icon
          )
        ),
        restaurants (
          id,
          name,
          contact_name,
          contact_phone
        ),
        companies (
          id,
          name,
          contact_name,
          contact_phone
        )
      `)

    // 状态筛选
    if (status && status !== "all") {
      query = query.eq("order_status", status)
    }

    // 餐厅ID筛选
    if (restaurantId) {
      query = query.eq("restaurant_id", restaurantId)
    }

    // 🔒 多租户隔离：强制按 provider_id 过滤（如果提供了 company_id）
    if (companyId) {
      query = enforceCompanyFilter(query, companyId, "provider_id")
      console.log("[设备租赁管理API] 应用多租户过滤，company_id:", companyId)
    }

    query = query.order("created_at", { ascending: false })

    let { data: orders, error } = await query

    // 如果 rental_orders 表不存在，尝试查询 rentals 表作为后备
    if (error && (error.code === "PGRST116" || error.code === "42P01" || error.message?.includes("does not exist") || error.message?.includes("schema cache") || error.message?.includes("Could not find the table"))) {
      console.warn("[设备租赁管理API] rental_orders 表查询失败:", error.message, "错误代码:", error.code)
      console.warn("[设备租赁管理API] 尝试查询 rentals 表作为后备")
      
      // 查询 rentals 表（简化版本，不包含关联查询）
      let rentalsQuery = supabaseClient
        .from("rentals")
        .select("*")
        .order("created_at", { ascending: false })

      // 状态映射：rental_orders 的状态 -> rentals 的状态
      if (status && status !== "all") {
        const statusMap: Record<string, string> = {
          "pending": "pending_delivery",
          "confirmed": "pending_delivery",
          "active": "active",
          "completed": "returned",
          "cancelled": "returned"
        }
        const mappedStatus = statusMap[status] || status
        rentalsQuery = rentalsQuery.eq("status", mappedStatus)
      }

      const { data: rentalsData, error: rentalsError } = await rentalsQuery

      if (rentalsError) {
        console.error("[设备租赁管理API] rentals 表查询也失败:", rentalsError)
        return NextResponse.json(
          {
            success: false,
            error: "获取租赁订单列表失败",
            details: `rental_orders 表不存在，且 rentals 表查询失败: ${rentalsError.message}`,
            data: [],
          },
          { status: 200 }
        )
      }

      // 将 rentals 数据转换为与 rental_orders 兼容的格式
      orders = (rentalsData || []).map((rental: any) => ({
        id: rental.id,
        order_number: `RENTAL-${rental.id.substring(0, 8).toUpperCase()}`,
        restaurant_id: null,
        user_id: null,
        equipment_id: null,
        quantity: 1,
        rental_period: rental.end_date && rental.start_date 
          ? Math.ceil((new Date(rental.end_date).getTime() - new Date(rental.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
          : 1,
        start_date: rental.start_date,
        end_date: rental.end_date,
        monthly_rental_price: rental.rent_amount,
        total_amount: rental.rent_amount,
        deposit_amount: rental.deposit,
        payment_status: "pending",
        order_status: rental.status === "pending_delivery" ? "pending" : 
                     rental.status === "active" ? "active" : 
                     rental.status === "returned" ? "completed" : "pending",
        payment_method: null,
        delivery_address: null,
        contact_phone: rental.customer_phone,
        notes: rental.notes,
        created_at: rental.created_at,
        updated_at: rental.updated_at,
        equipment: {
          id: null,
          name: rental.device_name,
          brand: null,
          model: null,
          images: null,
          monthly_rental_price: rental.rent_amount,
          deposit_amount: rental.deposit,
        },
        restaurants: null,
      }))
      error = null
    } else if (error) {
      console.error("[设备租赁管理API] 查询失败:", error)
      return NextResponse.json(
        {
          success: false,
          error: "获取租赁订单列表失败",
          details: error.message,
          data: [],
        },
        { status: 200 } // 返回 200 避免前端崩溃，但指示失败
      )
    }

    return NextResponse.json({
      success: true,
      data: orders || [],
    })
  } catch (err: any) {
    console.error("[设备租赁管理API] 捕获到服务器错误:", err)
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
        details: err.message,
        data: [],
      },
      { status: 200 } // 返回 200 避免前端崩溃，但指示失败
    )
  }
}

