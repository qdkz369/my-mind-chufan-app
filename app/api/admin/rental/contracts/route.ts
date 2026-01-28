/**
 * 租赁合同管理 API
 * 
 * GET: 获取租赁合同列表
 * POST: 创建新合同
 * 
 * 权限：仅 admin / super_admin 可访问
 * 说明：这是管理工具，不涉及业务流程、不展示金额、不关联订单/Facts
 * 
 * ⛔ 严格禁止事项：
 * 1. 禁止反向影响 Facts：不修改 Facts 表结构，不向 Facts API 添加字段
 * 2. 禁止判断设备可用性：不基于租赁状态判断设备是否可用
 * 3. 禁止引入 payment / settlement / invoice：不涉及支付、结算、发票逻辑
 * 4. 金额字段仅作记录：所有金额字段（agreed_daily_fee、agreed_monthly_fee）仅作记录，不做业务含义
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取租赁合同列表
 */
export async function GET(request: NextRequest) {
  try {
    // 权限验证
    // 调试：检查请求头中的 cookies
    const cookieHeader = request.headers.get("cookie")
    console.log("[租赁合同API] 请求 Cookie header:", {
      exists: !!cookieHeader,
      length: cookieHeader?.length || 0,
      fullHeader: cookieHeader || "无", // 显示完整的 header，不截断
      hasSupabaseCookies: cookieHeader ? (cookieHeader.includes("sb-") || cookieHeader.includes("supabase")) : false
    })
    
    // 检查所有相关的 headers
    console.log("[租赁合同API] 请求 Headers:", {
      cookie: cookieHeader ? "存在" : "不存在",
      authorization: request.headers.get("authorization") ? "存在" : "不存在",
      userAgent: request.headers.get("user-agent")?.substring(0, 50) || "无"
    })
    
    let userContext
    try {
      userContext = await getUserContext(request)
      
      // 检查 userContext 是否为 null（TypeScript 类型保护）
      if (!userContext) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "无法获取用户上下文信息",
          },
          { status: 401 }
        )
      }
      
      console.log("[租赁合同API] ✅ 用户上下文获取成功:", {
        role: userContext.role,
        companyId: userContext.companyId,
        userId: userContext.userId
      })
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      
      // 记录详细错误信息，便于调试
      console.error("[租赁合同API] ❌ 获取用户上下文失败:", {
        message: errorMessage,
        error: error,
        stack: error.stack,
        cookieHeader: cookieHeader ? "存在" : "不存在",
        cookieHeaderLength: cookieHeader?.length || 0,
        cookieHeaderPreview: cookieHeader ? cookieHeader.substring(0, 200) : "无"
      })
      
      if (errorMessage.includes("未登录") || errorMessage.includes("无法获取用户") || errorMessage.includes("无法获取认证")) {
        // 详细错误信息：区分是 RLS 还是 Middleware 导致的拦截
        const hasCookies = !!cookieHeader && cookieHeader.length > 0
        const hasSupabaseCookies = cookieHeader ? (cookieHeader.includes("sb-") || cookieHeader.includes("supabase")) : false
        
        let cause = "未知原因"
        if (!hasCookies) {
          cause = "Middleware 拦截：请求中未包含 cookies，可能是跨域问题或 cookies 未正确发送"
        } else if (!hasSupabaseCookies) {
          cause = "Middleware 拦截：请求中未包含 Supabase 认证 cookies，session 可能已过期"
        } else {
          cause = "RLS 策略拦截：cookies 存在但无法获取用户上下文，可能是 RLS 策略配置问题"
        }
        
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录管理员账号",
            cause: cause, // 添加原因说明
            debug: {
              hasCookies,
              hasSupabaseCookies,
              cookieHeaderLength: cookieHeader?.length || 0,
            }
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: errorMessage,
          cause: "RLS 策略或权限验证失败（需要 admin 或 super_admin 角色）",
        },
        { status: 403 }
      )
    }

    // 再次检查 userContext 是否为 null（TypeScript 类型保护）
    if (!userContext) {
      return NextResponse.json(
        {
          success: false,
          error: "未授权",
          details: "无法获取用户上下文信息",
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
          details: "仅管理员可访问",
        },
        { status: 403 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      console.error("[租赁合同API] Supabase URL 或密钥未配置")
      return NextResponse.json(
        { 
          success: false, 
          error: "数据库配置错误",
          details: "缺少 Supabase 环境变量配置"
        },
        { status: 500 }
      )
    }

    // 使用 createServerClient 来正确获取 auth session
    let supabaseClient
    try {
      const cookieStore = await cookies()
      supabaseClient = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // 在 Route Handler 中无法设置 cookies 是正常的
            }
          },
        },
      })
    } catch (error) {
      console.warn("[租赁合同API] 无法创建 SSR 客户端，使用基础客户端:", error)
      // 回退到使用 serviceRoleKey（如果可用）或 anonKey
      const keyToUse = serviceRoleKey || anonKey
      supabaseClient = createClient(supabaseUrl, keyToUse, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    }

    // 查询租赁合同列表
    const { data: contracts, error } = await supabaseClient
      .from("rental_contracts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[租赁合同API] 查询失败:", error)
      // 如果表不存在，返回空数组而不是错误
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("[租赁合同API] rental_contracts 表不存在，返回空数组")
        return NextResponse.json({
          success: true,
          data: [],
        })
      }
      return NextResponse.json(
        { success: false, error: "查询失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: contracts || [],
    })
  } catch (err: any) {
    console.error("[租赁合同API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

/**
 * POST: 创建新合同
 */
export async function POST(request: NextRequest) {
  try {
    // 权限验证
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

    // 检查 userContext 是否为 null（TypeScript 类型保护）
    if (!userContext) {
      return NextResponse.json(
        {
          success: false,
          error: "未授权",
          details: "无法获取用户上下文信息",
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
          details: "仅管理员可访问",
        },
        { status: 403 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      console.error("[租赁合同API] Supabase URL 或密钥未配置")
      return NextResponse.json(
        { 
          success: false, 
          error: "数据库配置错误",
          details: "缺少 Supabase 环境变量配置"
        },
        { status: 500 }
      )
    }

    // 使用 createServerClient 来正确获取 auth session
    let supabaseClient
    try {
      const cookieStore = await cookies()
      supabaseClient = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // 在 Route Handler 中无法设置 cookies 是正常的
            }
          },
        },
      })
    } catch (error) {
      console.warn("[租赁合同API] 无法创建 SSR 客户端，使用基础客户端:", error)
      // 回退到使用 serviceRoleKey（如果可用）或 anonKey
      const keyToUse = serviceRoleKey || anonKey
      supabaseClient = createClient(supabaseUrl, keyToUse, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    }

    const body = await request.json()
    const {
      contract_no,
      lessee_restaurant_id,
      lessor_type,
      lessor_id,
      start_at,
      end_at,
      billing_model,
      remark,
    } = body

    // 验证必需字段
    if (
      !contract_no ||
      !lessee_restaurant_id ||
      !lessor_type ||
      !lessor_id ||
      !start_at ||
      !end_at ||
      !billing_model
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "请填写所有必填项",
        },
        { status: 400 }
      )
    }

    // 验证日期
    const startDate = new Date(start_at)
    const endDate = new Date(end_at)
    if (endDate < startDate) {
      return NextResponse.json(
        {
          success: false,
          error: "日期无效",
          details: "结束日期不能早于开始日期",
        },
        { status: 400 }
      )
    }

    // 验证餐厅是否存在
    const { data: restaurant, error: restaurantError } = await supabaseClient
      .from("restaurants")
      .select("id")
      .eq("id", lessee_restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        {
          success: false,
          error: "餐厅不存在",
          details: "请选择有效的餐厅",
        },
        { status: 404 }
      )
    }

    // 检查合同编号是否已存在
    const { data: existingContract, error: checkError } = await supabaseClient
      .from("rental_contracts")
      .select("id")
      .eq("contract_no", contract_no)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 表示未找到记录，这是正常的
      console.error("[租赁合同API] 检查合同编号失败:", checkError)
      return NextResponse.json(
        {
          success: false,
          error: "检查合同编号失败",
          details: checkError.message,
        },
        { status: 500 }
      )
    }

    if (existingContract) {
      return NextResponse.json(
        {
          success: false,
          error: "合同编号已存在",
          details: "请使用不同的合同编号",
        },
        { status: 400 }
      )
    }

    // 创建合同
    const { data: contract, error: createError } = await supabaseClient
      .from("rental_contracts")
      .insert({
        contract_no,
        lessee_restaurant_id,
        lessor_type,
        lessor_id,
        start_at,
        end_at,
        billing_model,
        status: "draft", // 新建合同默认为草稿状态
        remark: remark || null,
      })
      .select("*")
      .single()

    if (createError) {
      console.error("[租赁合同API] 创建失败:", createError)
      return NextResponse.json(
        {
          success: false,
          error: "创建失败",
          details: createError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: contract,
      message: "合同创建成功",
    })
  } catch (err: any) {
    console.error("[租赁合同API] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
