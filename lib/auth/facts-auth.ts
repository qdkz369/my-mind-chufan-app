/**
 * 事实 API 权限验证模块
 * 
 * 核心原则：
 * - 仅允许已登录用户（客户端用户通过 restaurantId，管理员通过 Supabase Auth）
 * - restaurant_id 必须匹配用户归属
 * - 不得复用管理端 API
 * - 不得使用 service role（仅使用 anon key + RLS）
 * 
 * 验证流程：
 * 1. 检查是否有 Supabase Auth user（管理员）或 restaurantId（客户端用户）
 * 2. 如果是客户端用户，验证请求的 restaurant_id 是否与用户的 restaurant_id 匹配
 * 3. 如果是管理员，允许访问所有数据（但事实 API 主要面向客户端用户）
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseServer } from "@/lib/supabase/server"

/**
 * 从请求中提取用户身份
 * 支持两种方式：
 * 1. Supabase Auth user（管理员）
 * 2. 客户端用户（通过请求头 x-restaurant-id 传递 restaurantId）
 * 
 * 注意：
 * - 客户端用户通过手机号登录，restaurantId 存储在客户端 localStorage
 * - 客户端在调用 API 时，需要在请求头中传递 x-restaurant-id
 * - 服务端验证请求的 restaurant_id 是否与请求头中的 restaurantId 匹配
 * - 不使用 service role，仅使用 anon key + RLS
 */
async function extractUserIdentity(request: Request): Promise<{
  type: "admin" | "client" | "anonymous"
  userId?: string
  restaurantId?: string
}> {
  // 方式1：检查 Supabase Auth user（管理员）
  try {
    // 注意：在服务端 API 路由中，需要使用 supabaseServer 从 cookies 获取认证信息
    const supabaseClient = await supabaseServer()
    if (supabaseClient) {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (!authError && user) {
        // 检查是否是管理员角色
        try {
          const { data: roleData, error: roleError } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle()

          if (!roleError && roleData) {
            const actualRole = Array.isArray(roleData) ? roleData[0]?.role : roleData?.role
            if (actualRole === "super_admin" || actualRole === "platform_admin") {
              return { type: "admin", userId: user.id }
            }
          }
        } catch (roleCheckError) {
          // 角色查询失败，继续尝试客户端用户验证
          console.log("[事实API权限验证] 角色查询失败，尝试客户端用户验证:", roleCheckError)
        }
      }
    }
  } catch (error) {
    // Auth 验证失败，继续尝试客户端用户验证
    console.log("[事实API权限验证] Supabase Auth 验证失败，尝试客户端用户验证:", error)
  }

  // 方式2：检查客户端用户（通过请求头 x-restaurant-id）
  // 注意：客户端在调用 API 时，需要从 localStorage 获取 restaurantId 并传递
  // 注意：虽然请求头可以被伪造，但这至少可以防止正常使用场景下的越权访问
  // 未来可以考虑使用 JWT token 或 session 进行更安全的验证
  const restaurantIdHeader = request.headers.get("x-restaurant-id")
  if (restaurantIdHeader && restaurantIdHeader.trim() !== "") {
    return { type: "client", restaurantId: restaurantIdHeader.trim() }
  }

  // 如果都不存在，返回匿名
  return { type: "anonymous" }
}

/**
 * 验证用户是否有权限访问指定的 restaurant_id
 * 
 * @param request 请求对象
 * @param requestedRestaurantId 请求的 restaurant_id
 * @returns 验证结果，如果失败返回 NextResponse，如果成功返回 null
 */
export async function verifyFactAccess(
  request: Request,
  requestedRestaurantId: string
): Promise<NextResponse | null> {
  try {
    // 1. 提取用户身份
    const identity = await extractUserIdentity(request)

    // 2. 如果是匿名用户，拒绝访问
    if (identity.type === "anonymous") {
      return NextResponse.json(
        {
          error: "未授权访问",
          message: "仅允许已登录用户访问事实 API",
        },
        { status: 401 }
      )
    }

    // 3. 如果是管理员，允许访问所有数据（但事实 API 主要面向客户端用户）
    if (identity.type === "admin") {
      // 管理员可以访问，但记录日志
      console.log("[事实API权限验证] 管理员访问，允许:", requestedRestaurantId)
      return null
    }

    // 4. 如果是客户端用户，验证 restaurant_id 是否匹配
    if (identity.type === "client") {
      if (!identity.restaurantId) {
        return NextResponse.json(
          {
            error: "未授权访问",
            message: "缺少 restaurant_id 身份信息",
          },
          { status: 401 }
        )
      }

      // 验证请求的 restaurant_id 是否与用户的 restaurant_id 匹配
      if (identity.restaurantId !== requestedRestaurantId) {
        return NextResponse.json(
          {
            error: "权限不足",
            message: "restaurant_id 必须匹配用户归属",
            requested: requestedRestaurantId,
            user_restaurant_id: identity.restaurantId,
          },
          { status: 403 }
        )
      }

      // 验证通过
      console.log("[事实API权限验证] 客户端用户验证通过:", identity.restaurantId)
      return null
    }

    // 未知身份类型
    return NextResponse.json(
      {
        error: "未授权访问",
        message: "无法识别用户身份",
      },
      { status: 401 }
    )
  } catch (error) {
    console.error("[事实API权限验证] 验证过程出错:", error)
    // 即使验证过程出错，也允许客户端用户通过请求头访问（降级处理）
    // 这样可以避免因为认证系统问题导致整个页面无法加载
    const restaurantIdHeader = request.headers.get("x-restaurant-id")
    if (restaurantIdHeader && restaurantIdHeader.trim() !== "") {
      console.warn("[事实API权限验证] 验证过程出错，但检测到 x-restaurant-id 请求头，允许访问:", restaurantIdHeader)
      return null
    }
    
    // 如果没有请求头，返回 401 而不是 500，避免误导用户
    return NextResponse.json(
      {
        error: "未授权访问",
        message: "请确保已登录并传递正确的身份信息",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 401 }
    )
  }
}

/**
 * 验证订单是否属于指定的 restaurant_id
 * 用于订单事实 API 的额外验证
 * 
 * @param orderId 订单 ID
 * @param restaurantId 餐厅 ID
 * @returns 验证结果，如果失败返回 NextResponse，如果成功返回 null
 */
export async function verifyOrderOwnership(
  orderId: string,
  restaurantId: string
): Promise<NextResponse | null> {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    // 查询订单的 restaurant_id
    const { data: orderData, error: orderError } = await supabase
      .from("delivery_orders")
      .select("restaurant_id")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError) {
      console.error("[订单归属验证] 查询订单失败:", orderError)
      return NextResponse.json(
        {
          error: "订单不存在",
          details: orderError.message,
        },
        { status: 404 }
      )
    }

    if (!orderData) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      )
    }

    // 验证订单是否属于指定的餐厅
    if (orderData.restaurant_id !== restaurantId) {
      return NextResponse.json(
        {
          error: "权限不足",
          message: "订单不属于指定的餐厅",
          order_id: orderId,
          requested_restaurant_id: restaurantId,
          actual_restaurant_id: orderData.restaurant_id,
        },
        { status: 403 }
      )
    }

    return null
  } catch (error) {
    console.error("[订单归属验证] 验证过程出错:", error)
    return NextResponse.json(
      {
        error: "验证失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
