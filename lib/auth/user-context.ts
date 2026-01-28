/**
 * 统一用户上下文解析模块
 * 
 * 这是系统中唯一可信的权限入口，所有 API 必须通过此模块获取用户身份和权限信息。
 * 
 * 规则：
 * 1. 从 Supabase Auth session 中获取 userId
 * 2. 从 user_roles 表获取 role
 * 3. 如果 role ≠ super_admin，从 restaurants 表获取 company_id（使用 user_id 字段匹配）
 * 4. 如果查不到 company_id，返回 null（不抛出错误，避免 500）
 * 5. super_admin 允许 companyId 为 undefined
 * 
 * 禁止 API 自行查询 user_roles 或 user_companies 表，必须使用此模块。
 */

import { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export type UserRole =
  | "super_admin"      // 系统级（全平台）
  | "platform_admin"   // 平台运营
  | "company_admin"    // 公司管理员
  | "staff"
  | "factory"
  | "filler"

export interface UserContext {
  userId: string
  role: UserRole
  companyId?: string
}

// ⚠️ 临时修复：允许 getUserContext 返回 null，避免 500 崩溃
export type UserContextOrNull = UserContext | null

/**
 * 从 Request 对象的 Cookie header 中解析 cookies
 */
function parseCookiesFromRequest(request: Request): Array<{ name: string; value: string }> {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) {
    return []
  }

  return cookieHeader.split(";").map((cookie) => {
    const [name, ...valueParts] = cookie.trim().split("=")
    return {
      name: name.trim(),
      value: valueParts.join("=").trim(),
    }
  })
}

/**
 * 获取用户上下文（唯一可信的权限入口）
 * 
 * @param req NextRequest 或 Request 对象
 * @returns UserContext 对象，包含 userId、role 和可选的 companyId，如果失败返回 null
 * @note 如果找不到 company_id，返回 undefined 而不是抛出错误（避免 500）
 * @note ⚠️ 临时修复：与权限、公司、用户相关的错误改为 console.error 并返回 null，避免 500 崩溃
 */
export async function getUserContext(req: NextRequest | Request): Promise<UserContext | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      // ⚠️ 临时修复：改为 console.error 并返回 null，避免 500 崩溃
      console.error("[getUserContext] 服务器配置错误：缺少 Supabase 环境变量")
      return null
    }

  // 1. 从 Supabase Auth session 中获取 userId
  // 在 Route Handler 中，优先使用 Next.js cookies() API（最可靠）
  let cookieStore: Array<{ name: string; value: string }> = []
  let cookieSource = "unknown"
  
  // 优先从 Next.js cookies() API 获取（在 Route Handler 中更可靠）
  try {
    const cookieStoreFromNext = await cookies()
    cookieStore = cookieStoreFromNext.getAll()
    cookieSource = "next-cookies-api"
    console.log("[getUserContext] ✅ 使用 Next.js cookies() API，数量:", cookieStore.length)
    
    if (cookieStore.length > 0) {
      const cookieNames = cookieStore.map(c => c.name).join(", ")
      console.log("[getUserContext] Cookie 名称:", cookieNames)
      const hasSupabaseCookie = cookieStore.some(c => c.name.startsWith("sb-") || c.name.includes("supabase"))
      console.log("[getUserContext] 包含 Supabase cookie:", hasSupabaseCookie)
      
      if (!hasSupabaseCookie && process.env.NODE_ENV === "development") {
        console.warn("[getUserContext] ⚠️ 开发环境警告：未检测到 Supabase cookie")
        console.warn("[getUserContext] 调试建议：")
        console.warn("  1. 检查浏览器是否在无痕模式下运行（无痕模式会阻止 cookies）")
        console.warn("  2. 检查前端请求是否设置了 credentials: 'include'")
        console.warn("  3. 检查 Supabase Auth session 是否已过期，尝试重新登录")
        console.warn("  4. 检查浏览器控制台是否有 Cookie 相关的错误")
      }
    } else {
      // 如果 cookies() API 为空，尝试从 NextRequest 获取
      if (req instanceof NextRequest) {
        console.log("[getUserContext] Next.js cookies() API 为空，尝试从 NextRequest 获取")
        cookieStore = req.cookies.getAll()
        cookieSource = "nextrequest-cookies"
        console.log("[getUserContext] NextRequest cookies 数量:", cookieStore.length)
        
        if (cookieStore.length === 0) {
          // 最后尝试从 headers 解析
          console.log("[getUserContext] NextRequest cookies 也为空，尝试从 headers 解析")
          cookieStore = parseCookiesFromRequest(req as Request)
          cookieSource = "request-headers"
          console.log("[getUserContext] 从 headers 解析的 cookies 数量:", cookieStore.length)
        }
      } else if (req instanceof Request) {
        // 普通 Request 对象，从 headers 解析
        console.log("[getUserContext] Next.js cookies() API 为空，尝试从 Request headers 解析")
        cookieStore = parseCookiesFromRequest(req)
        cookieSource = "request-headers"
        console.log("[getUserContext] 从 Request headers 解析的 cookies 数量:", cookieStore.length)
      }
    }
  } catch (cookiesApiError) {
    console.warn("[getUserContext] Next.js cookies() API 获取失败，尝试其他方式:", cookiesApiError)
    // 回退到从 Request 对象获取
    if (req instanceof NextRequest) {
      try {
        cookieStore = req.cookies.getAll()
        cookieSource = "nextrequest-cookies-fallback"
        console.log("[getUserContext] ✅ 使用 NextRequest cookies（回退），数量:", cookieStore.length)
        
        if (cookieStore.length > 0) {
          const cookieNames = cookieStore.map(c => c.name).join(", ")
          console.log("[getUserContext] Cookie 名称:", cookieNames)
          const hasSupabaseCookie = cookieStore.some(c => c.name.startsWith("sb-") || c.name.includes("supabase"))
          console.log("[getUserContext] 包含 Supabase cookie:", hasSupabaseCookie)
        } else {
          cookieStore = parseCookiesFromRequest(req as Request)
          cookieSource = "request-headers-fallback"
          console.log("[getUserContext] 从 headers 解析的 cookies 数量:", cookieStore.length)
        }
      } catch (nextReqError) {
        console.log("[getUserContext] NextRequest cookies 获取失败，尝试从 headers 解析:", nextReqError)
        cookieStore = parseCookiesFromRequest(req as Request)
        cookieSource = "request-headers-error-fallback"
        console.log("[getUserContext] 从 headers 解析的 cookies 数量:", cookieStore.length)
      }
    } else if (req instanceof Request) {
      // 普通 Request 对象，从 headers 解析
      cookieStore = parseCookiesFromRequest(req)
      cookieSource = "request-headers"
      console.log("[getUserContext] 从 Request headers 解析 cookies，数量:", cookieStore.length)
      
      // 调试：输出 cookie header
      const cookieHeader = req.headers.get("cookie")
      if (cookieHeader) {
        console.log("[getUserContext] Cookie header 存在，长度:", cookieHeader.length)
        const hasSupabaseCookie = cookieHeader.includes("sb-") || cookieHeader.includes("supabase")
        console.log("[getUserContext] 包含 Supabase cookie:", hasSupabaseCookie)
        // 输出前100个字符用于调试
        console.log("[getUserContext] Cookie header 预览:", cookieHeader.substring(0, 100))
      } else {
        console.warn("[getUserContext] ⚠️ Cookie header 不存在！")
        
        // 开发环境下提供详细的调试建议
        if (process.env.NODE_ENV === "development") {
          console.error("[getUserContext] ❌ 开发环境调试信息：")
          console.error("  Cookie 来源:", cookieSource)
          console.error("  请求类型:", req instanceof NextRequest ? "NextRequest" : "Request")
          console.error("  请求 URL:", req.url)
          console.error("  请求方法:", req.method)
          console.error("")
          console.error("  调试建议：")
          console.error("  1. 检查前端请求是否设置了 credentials: 'include'")
          console.error("  2. 检查浏览器是否在无痕模式下运行")
          console.error("  3. 检查浏览器控制台 Network 标签，查看请求头中是否包含 Cookie")
          console.error("  4. 检查 Supabase Auth session 是否已过期")
          console.error("  5. 尝试清除浏览器 cookies 并重新登录")
          console.error("  6. 检查 Next.js 中间件是否拦截了 cookies")
        }
      }
    } else {
      // ⚠️ 临时修复：改为 console.error 并返回 null，避免 500 崩溃
      console.error("[getUserContext] ❌ 无法识别请求类型:", typeof req)
      return null
    }
  }
  
  // 记录 cookie 来源，便于调试
  console.log("[getUserContext] Cookie 来源:", cookieSource, "，数量:", cookieStore.length)

  // 使用 createServerClient 创建 Supabase 客户端（支持从 cookies 读取 session）
  // 这是 @supabase/ssr 包中用于 Route Handlers 的标准方法
  const supabaseClient = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore
        },
        setAll(cookiesToSet) {
          // 在 Route Handler 中，无法设置 cookies，只能读取
          // 这不会影响认证，因为认证信息已经存储在 cookies 中
          try {
            // 如果是 NextRequest，尝试设置 cookies
            if (req instanceof NextRequest) {
              cookiesToSet.forEach(({ name, value }) => {
                req.cookies.set(name, value)
              })
            }
          } catch (error) {
            // 忽略错误，在 Route Handler 中无法设置 cookies 是正常的
            // 这不会影响认证，因为认证信息已经存储在 cookies 中
            if (process.env.NODE_ENV === "development") {
              console.warn("[getUserContext] 无法设置 cookies（这是正常的）:", error)
            }
          }
        },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser()

  if (authError || !user) {
    const errorDetails = {
      authError: authError?.message || "无错误",
      hasUser: !!user,
      cookieCount: cookieStore.length,
      cookieNames: cookieStore.map(c => c.name).join(", "),
      cookieSource: cookieSource,
      hasSupabaseCookies: cookieStore.some(c => c.name.startsWith("sb-") || c.name.includes("supabase"))
    }
    
    console.error("[getUserContext] 获取用户失败:", errorDetails)
    
    // 开发环境下提供详细的调试建议
    if (process.env.NODE_ENV === "development") {
      console.error("[getUserContext] ❌ 开发环境调试信息：")
      console.error("  Cookie 数量:", cookieStore.length)
      console.error("  Cookie 名称:", cookieStore.map(c => c.name).join(", ") || "无")
      console.error("  Cookie 来源:", cookieSource)
      console.error("  包含 Supabase cookie:", errorDetails.hasSupabaseCookies)
      console.error("  Auth 错误:", authError?.message || "无")
      console.error("")
      console.error("  调试建议：")
      if (cookieStore.length === 0) {
        console.error("  1. ❌ 请求中未包含任何 cookies")
        console.error("     → 检查前端请求是否设置了 credentials: 'include'")
        console.error("     → 检查浏览器是否在无痕模式下运行")
        console.error("     → 检查浏览器控制台 Network 标签，查看请求头")
      } else if (!errorDetails.hasSupabaseCookies) {
        console.error("  2. ❌ 请求中未包含 Supabase 认证 cookies")
        console.error("     → Supabase Auth session 可能已过期，请重新登录")
        console.error("     → 检查浏览器是否清除了 cookies")
        console.error("     → 检查 Supabase Auth 配置是否正确")
      } else {
        console.error("  3. ❌ 包含 Supabase cookies 但无法获取用户")
        console.error("     → 可能是 Supabase Auth session 已过期")
        console.error("     → 可能是 RLS 策略配置问题")
        console.error("     → 尝试清除浏览器 cookies 并重新登录")
      }
    }
    
    // ⚠️ 临时修复：改为 console.error 并返回 null，避免 500 崩溃
    console.error("[getUserContext] 用户未登录")
    return null
  }
  
  console.log("[getUserContext] ✅ 成功获取用户:", {
    userId: user.id,
    email: user.email,
    cookieCount: cookieStore.length
  })

  const userId = user.id

  // 2. 从 user_roles 表获取 role
  // 使用 Service Role Key 以确保能查询到角色信息（绕过 RLS）
  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey || supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const { data: roleData, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single()

  if (roleError || !roleData) {
    // ⚠️ 临时修复：改为 console.error 并返回 null，避免 500 崩溃
    console.error("[getUserContext] 权限不足：无法获取用户角色", roleError?.message || "无角色数据")
    return null
  }

  const role = roleData.role as UserRole

  // 3. 如果 role ≠ super_admin，从 restaurants 表获取 company_id
  // 🔒 彻底切换到 restaurants 表，使用 user_id 字段匹配
  if (role !== "super_admin") {
    // 从 restaurants 表中查找用户关联的餐厅，获取 company_id
    // 使用 user_id 字段匹配当前用户
    const { data: restaurantData, error: restaurantError } = await adminClient
      .from("restaurants")
      .select("company_id")
      .eq("user_id", userId)
      .not("company_id", "is", null)
      .limit(1)
      .maybeSingle() // 使用 maybeSingle() 而不是 single()，避免表不存在时抛出错误

    let companyId: string | undefined | null = null
    
    if (!restaurantError && restaurantData && restaurantData.company_id) {
      // 从 restaurants 表获取 company_id
      companyId = restaurantData.company_id
      console.log("[getUserContext] ✅ 从 restaurants 表获取 company_id:", companyId)
    } else {
      // 如果 restaurants 表中没有找到，返回 null（不抛出错误）
      console.warn("[getUserContext] ⚠️ restaurants 表中未找到 company_id，user_id:", userId)
      if (restaurantError) {
        console.warn("[getUserContext] 查询错误:", restaurantError.message)
      }
      companyId = null
    }

    // 重要：如果找不到公司，返回 null，绝对不要 throw Error 触发 500
    return {
      userId,
      role,
      companyId: companyId || undefined, // 将 null 转换为 undefined
    }
  }

  // 4. super_admin 允许 companyId 为 undefined
  return {
    userId,
    role,
    companyId: undefined,
  }
}
