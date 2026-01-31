/**
 * 获取设备租赁记录列表 API
 *
 * GET /api/device-rentals/list
 *
 * 功能：获取设备租赁记录列表（需登录，非 super_admin 按 company_id 过滤）
 *
 * 查询参数：
 * - device_id: 设备ID（可选）
 * - restaurant_id: 餐厅ID（可选）
 * - status: 状态（active / ended，可选）
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { enforceCompanyFilter } from "@/lib/multi-tenant"

export async function GET(request: Request) {
  try {
    let userContext: Awaited<ReturnType<typeof getUserContext>> = null
    let clientRestaurantId: string | null = null

    try {
      userContext = await getUserContext(request)
      if (!userContext) {
        clientRestaurantId = request.headers.get("x-restaurant-id")
        if (clientRestaurantId && clientRestaurantId.trim() !== "") {
          console.log("[设备租赁记录API] 使用客户端用户认证，restaurant_id:", clientRestaurantId)
        } else {
          return NextResponse.json(
            { success: false, error: "未授权", details: "请先登录", data: [] },
            { status: 401 }
          )
        }
      } else if (userContext.role === "super_admin") {
        console.log("[设备租赁记录API] Super Admin 访问，跳过多租户过滤")
      }
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      if (errorMessage.includes("未登录") || !userContext) {
        clientRestaurantId = request.headers.get("x-restaurant-id")
        if (clientRestaurantId && clientRestaurantId.trim() !== "") {
          console.log("[设备租赁记录API] getUserContext 失败，使用客户端用户认证，restaurant_id:", clientRestaurantId)
        } else {
          return NextResponse.json(
            { success: false, error: "未授权", details: "请先登录", data: [] },
            { status: 401 }
          )
        }
      } else {
        return NextResponse.json(
          { success: false, error: "权限不足", details: errorMessage, data: [] },
          { status: 403 }
        )
      }
    }

    if (!userContext && !clientRestaurantId) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录", data: [] },
        { status: 401 }
      )
    }

    if (userContext && !userContext.companyId && userContext.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "权限不足", details: "用户未关联任何公司", data: [] },
        { status: 403 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json(
        { success: false, error: "服务器配置错误", details: "Supabase 密钥未配置", data: [] },
        { status: 500 }
      )
    }

    const supabaseClient = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : createClient(supabaseUrl, anonKey!, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device_id")
    const restaurantIdParam = searchParams.get("restaurant_id")
    const status = searchParams.get("status")

    // 客户端认证时：仅允许查询该餐厅自己的数据
    const restaurantId = clientRestaurantId ?? restaurantIdParam

    let query = supabaseClient
      .from("device_rentals")
      .select(
        `
        *,
        devices:device_id (
          device_id,
          model,
          status
        ),
        restaurants:restaurant_id (
          id,
          name,
          address
        )
      `
      )
      .order("created_at", { ascending: false })

    if (deviceId) query = query.eq("device_id", deviceId)
    if (restaurantId) query = query.eq("restaurant_id", restaurantId)
    if (status) query = query.eq("status", status)

    if (!clientRestaurantId && userContext?.companyId && userContext.role !== "super_admin") {
      query = enforceCompanyFilter(query, userContext.companyId, "company_id")
    }

    const { data: rentals, error } = await query

    if (error) {
      console.error("[设备租赁记录API] 查询失败:", error)
      return NextResponse.json(
        { success: false, error: "查询租赁记录失败", details: error.message, data: [] },
        { status: 200 }
      )
    }

    return NextResponse.json({ success: true, data: rentals || [] })
  } catch (err: any) {
    console.error("[设备租赁记录API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message, data: [] },
      { status: 500 }
    )
  }
}
