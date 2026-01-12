/**
 * 多租户数据隔离工具
 * 确保所有数据查询都按 company_id 进行过滤
 */

import { createClient } from "@supabase/supabase-js"

/**
 * 从请求中获取当前用户的 user_id
 * 优先级：
 * 1. 请求头中的 x-user-id
 * 2. JWT token 中的 user_id
 * 3. Authorization header 中的 Bearer token
 */
export async function getCurrentUserId(request: Request): Promise<string | null> {
  try {
    // 方法1：从请求头获取
    const headerUserId = request.headers.get("x-user-id")
    if (headerUserId) {
      return headerUserId
    }

    // 方法2：从 Authorization header 获取 JWT token
    const authHeader = request.headers.get("authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !anonKey) {
        console.error("[多租户] 缺少 Supabase 环境变量配置")
        return null
      }

      const supabaseClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })

      const { data: { user }, error } = await supabaseClient.auth.getUser(token)
      if (!error && user) {
        return user.id
      }
    }

    return null
  } catch (error) {
    console.error("[多租户] 获取 user_id 失败:", error)
    return null
  }
}

/**
 * 从请求中获取当前用户的 company_id
 * 优先级：
 * 1. 请求参数中的 company_id
 * 2. 请求头中的 x-company-id
 * 3. 从 user_companies 表中查询（通过 user_id）
 */
export async function getCurrentCompanyId(request: Request): Promise<string | null> {
  try {
    // 方法1：从查询参数获取
    const { searchParams } = new URL(request.url)
    const queryCompanyId = searchParams.get("company_id")
    if (queryCompanyId) {
      return queryCompanyId
    }

    // 方法2：从请求头获取
    const headerCompanyId = request.headers.get("x-company-id")
    if (headerCompanyId) {
      return headerCompanyId
    }

    // 方法3：从 user_companies 表查询（通过 user_id）
    const userId = await getCurrentUserId(request)
    if (userId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl) {
        console.error("[多租户] 缺少 NEXT_PUBLIC_SUPABASE_URL 环境变量")
        return null
      }

      if (!serviceRoleKey && !anonKey) {
        console.error("[多租户] 缺少 Supabase 密钥配置")
        return null
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

      // TODO: 使用 getUserContext 统一获取用户上下文，禁止直接查询 user_companies
      // 从 user_companies 表查询用户的主公司
      const { data, error } = await supabaseClient
        .from("user_companies")
        .select("company_id")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .single()

      if (!error && data) {
        return data.company_id
      }

      // 如果没有主公司，获取第一个公司
      const { data: firstCompany, error: firstError } = await supabaseClient
        .from("user_companies")
        .select("company_id")
        .eq("user_id", userId)
        .limit(1)
        .single()

      if (!firstError && firstCompany) {
        return firstCompany.company_id
      }
    }

    return null
  } catch (error) {
    console.error("[多租户] 获取 company_id 失败:", error)
    return null
  }
}

/**
 * 强制在查询中添加 company_id 过滤
 * @param query Supabase 查询对象
 * @param companyId 公司ID
 * @param companyIdField 公司ID字段名（默认：provider_id）
 */
export function enforceCompanyFilter(
  query: any,
  companyId: string | null,
  companyIdField: string = "provider_id"
): any {
  if (!companyId) {
    throw new Error(`缺少 company_id，无法执行查询。字段名: ${companyIdField}`)
  }

  return query.eq(companyIdField, companyId)
}

/**
 * 验证用户是否有权限访问指定公司的数据
 */
export async function verifyCompanyAccess(
  userId: string,
  companyId: string
): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      console.error("[多租户] 缺少 NEXT_PUBLIC_SUPABASE_URL 环境变量")
      return false
    }

    if (!serviceRoleKey && !anonKey) {
      console.error("[多租户] 缺少 Supabase 密钥配置")
      return false
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

    // TODO: 使用 getUserContext 统一获取用户上下文，禁止直接查询 user_companies
    // 从 user_companies 表查询用户是否属于该公司
    const { data, error } = await supabaseClient
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .single()

    return !error && !!data
  } catch (error) {
    console.error("[多租户] 验证公司访问权限失败:", error)
    return false
  }
}

/**
 * 多租户查询包装器
 * 自动添加 company_id 过滤
 */
export function withCompanyFilter<T>(
  query: any,
  companyId: string | null,
  companyIdField: string = "provider_id"
): T {
  if (!companyId) {
    throw new Error("缺少 company_id，查询被拒绝")
  }
  return enforceCompanyFilter(query, companyId, companyIdField) as T
}

