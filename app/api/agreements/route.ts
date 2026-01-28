/**
 * 协议管理 API
 * 
 * GET /api/agreements - 获取协议列表
 * POST /api/agreements - 创建新协议
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getUserContext } from "@/lib/auth/user-context"

export async function GET(request: NextRequest) {
  try {
    // 权限验证：确保用户已登录
    // 调试：检查请求头中的 cookies
    const cookieHeader = request.headers.get("cookie")
    console.log("[协议管理API] 请求 Cookie header:", {
      exists: !!cookieHeader,
      length: cookieHeader?.length || 0,
      fullHeader: cookieHeader || "无", // 显示完整的 header，不截断
      hasSupabaseCookies: cookieHeader ? (cookieHeader.includes("sb-") || cookieHeader.includes("supabase")) : false
    })
    
    // 检查所有相关的 headers
    console.log("[协议管理API] 请求 Headers:", {
      cookie: cookieHeader ? "存在" : "不存在",
      authorization: request.headers.get("authorization") ? "存在" : "不存在",
      userAgent: request.headers.get("user-agent")?.substring(0, 50) || "无"
    })
    
    const userContext = await getUserContext(request)
    
    if (!userContext) {
      // 详细错误信息：区分是 RLS 还是 Middleware 导致的拦截
      const hasCookies = !!cookieHeader && cookieHeader.length > 0
      const hasSupabaseCookies = cookieHeader ? (cookieHeader.includes("sb-") || cookieHeader.includes("supabase")) : false
      const isDevelopment = process.env.NODE_ENV === "development"
      
      let cause = "未知原因"
      let debugInfo: any = {
        hasCookies,
        hasSupabaseCookies,
        cookieHeaderLength: cookieHeader?.length || 0,
      }
      
      if (!hasCookies) {
        cause = "请求中未包含 cookies"
        if (isDevelopment) {
          debugInfo.suggestions = [
            "检查前端请求是否设置了 credentials: 'include'",
            "检查浏览器是否在无痕模式下运行（无痕模式会阻止 cookies）",
            "检查浏览器控制台 Network 标签，查看请求头中是否包含 Cookie",
            "检查 Next.js 中间件是否拦截了 cookies"
          ]
        }
      } else if (!hasSupabaseCookies) {
        cause = "请求中未包含 Supabase 认证 cookies"
        if (isDevelopment) {
          debugInfo.suggestions = [
            "Supabase Auth session 可能已过期，请重新登录",
            "检查浏览器是否清除了 cookies",
            "检查 Supabase Auth 配置是否正确"
          ]
        }
      } else {
        cause = "cookies 存在但无法获取用户上下文"
        if (isDevelopment) {
          debugInfo.suggestions = [
            "可能是 Supabase Auth session 已过期",
            "可能是 RLS 策略配置问题",
            "尝试清除浏览器 cookies 并重新登录",
            "检查服务器日志中的详细错误信息"
          ]
        }
      }
      
      // 记录详细错误信息，便于调试
      console.error("[协议管理API] ❌ 获取用户上下文失败:", {
        cookieHeader: cookieHeader ? "存在" : "不存在",
        cookieHeaderLength: cookieHeader?.length || 0,
        cookieHeaderPreview: cookieHeader ? cookieHeader.substring(0, 200) : "无"
      })
      
      // 开发环境下在终端输出详细调试信息
      if (isDevelopment) {
        console.error("[协议管理API] ❌ 401 错误 - 详细调试信息：")
        console.error("  错误原因:", cause)
        console.error("  请求 URL:", request.url)
        console.error("  请求方法:", request.method)
        console.error("  Cookie header 存在:", hasCookies)
        console.error("  Cookie header 长度:", cookieHeader?.length || 0)
        console.error("  包含 Supabase cookies:", hasSupabaseCookies)
        if (debugInfo.suggestions) {
          console.error("  调试建议:")
          debugInfo.suggestions.forEach((suggestion: string, index: number) => {
            console.error(`    ${index + 1}. ${suggestion}`)
          })
        }
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "未授权",
          details: "请先登录",
          cause: cause,
          debug: debugInfo
        },
        { status: 401 }
      )
    }
    
    console.log("[协议管理API] ✅ 用户上下文获取成功:", {
      role: userContext.role,
      companyId: userContext.companyId,
      userId: userContext.userId
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
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

    // 使用 serviceRoleKey 创建客户端以绕过 RLS（管理员操作需要完全访问权限）
    // 如果 serviceRoleKey 不可用，回退到 createServerClient（从 cookies 读取 session）
    let supabaseClient
    if (serviceRoleKey) {
      // 优先使用 serviceRoleKey，绕过 RLS 限制
      supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      console.log("[协议管理API] ✅ 使用 serviceRoleKey 创建客户端（绕过 RLS）")
    } else {
      // 回退到使用 createServerClient（从 cookies 读取 session）
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
        console.log("[协议管理API] ✅ 使用 createServerClient 创建客户端，cookies 数量:", cookieStore.getAll().length)
      } catch (error) {
        console.warn("[协议管理API] 无法创建 SSR 客户端，使用基础客户端:", error)
        // 最后回退到使用 anonKey
        supabaseClient = createClient(supabaseUrl, anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
      }
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const activeOnly = searchParams.get("active_only") === "true"

    let query = supabaseClient
      .from("agreements")
      .select("*")
      .order("created_at", { ascending: false })

    // 🔒 多租户隔离：按 company_id 过滤
    // super_admin 和 admin 可以查看所有协议，其他角色只能查看自己公司的
    if (userContext.role !== "super_admin" && userContext.role !== "platform_admin") {
      if (userContext.companyId) {
        // 普通用户：只能查看自己公司的协议，或者平台通用协议（company_id IS NULL）
        query = query.or(`company_id.eq.${userContext.companyId},company_id.is.null`)
      } else {
        // 如果没有 companyId，只能查看平台通用协议
        query = query.is("company_id", null)
      }
    }
    // super_admin 和 admin 可以查看所有协议，不需要过滤

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
      // 如果表不存在，返回空数组而不是错误
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("[协议管理API] agreements 表不存在，返回空数组")
        return NextResponse.json({
          success: true,
          data: [],
        })
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

export async function POST(request: NextRequest) {
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
          details: "仅管理员可创建协议",
        },
        { status: 403 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
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

    // 使用 serviceRoleKey 创建客户端以绕过 RLS（管理员操作需要完全访问权限）
    // 如果 serviceRoleKey 不可用，回退到 createServerClient（从 cookies 读取 session）
    let supabaseClient
    if (serviceRoleKey) {
      // 优先使用 serviceRoleKey，绕过 RLS 限制
      supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      console.log("[协议管理API] ✅ 使用 serviceRoleKey 创建客户端（绕过 RLS）")
    } else {
      // 回退到使用 createServerClient（从 cookies 读取 session）
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
        console.log("[协议管理API] ✅ 使用 createServerClient 创建客户端，cookies 数量:", cookieStore.getAll().length)
      } catch (error) {
        console.warn("[协议管理API] 无法创建 SSR 客户端，使用基础客户端:", error)
        // 最后回退到使用 anonKey
        supabaseClient = createClient(supabaseUrl, anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
      }
    }

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
        { 
          success: false,
          error: "缺少必需字段：title, type, content" 
        },
        { status: 400 }
      )
    }

    // 🔒 多租户隔离：设置 company_id
    // super_admin 可以创建平台通用协议（company_id = null）或指定公司的协议
    // admin 可以创建平台通用协议或指定公司的协议
    // 其他角色只能创建自己公司的协议
    const companyId = userContext.role === "super_admin" 
      ? (body.company_id || null)  // super_admin 可以指定 company_id，或创建平台通用协议
      : userContext.role === "platform_admin"
      ? (body.company_id || null)  // platform_admin 也可以指定 company_id，或创建平台通用协议
      : userContext.companyId || null  // 其他角色只能使用自己的 companyId

    // 如果要设置为active，需要先取消同类型、同公司的其他协议的active状态
    if (is_active && status === "published") {
      let deactivateQuery = supabaseClient
        .from("agreements")
        .update({ is_active: false })
        .eq("type", type)
        .eq("is_active", true)
      
      // 🔒 多租户隔离：只取消同一公司的协议
      if (companyId) {
        deactivateQuery = deactivateQuery.eq("company_id", companyId)
      } else {
        // 如果是平台通用协议，只取消其他平台通用协议
        deactivateQuery = deactivateQuery.is("company_id", null)
      }

      const { error: deactivateError } = await deactivateQuery

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
        created_by: userContext.userId, // 使用 userContext 中的 userId
        company_id: companyId, // 添加 company_id
      })
      .select()
      .single()

    if (error) {
      console.error("[协议管理API] 创建失败:", error)
      // 如果表不存在，提示用户执行迁移脚本
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            success: false,
            error: "创建协议失败", 
            details: "agreements 表不存在，请先执行数据库迁移脚本：migrations/20250121_agreements_table.sql"
          },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { 
          success: false,
          error: "创建协议失败", 
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
