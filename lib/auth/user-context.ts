/**
 * 统一用户上下文解析模块
 * 
 * 这是系统中唯一可信的权限入口，所有 API 必须通过此模块获取用户身份和权限信息。
 * 
 * 规则：
 * 1. 从 Supabase Auth session 中获取 userId
 * 2. 从 user_roles 表获取 role
 * 3. 如果 role ≠ super_admin，必须从 user_companies 获取 company_id
 * 4. 如果查不到 company_id（非 super_admin），直接抛出 403 错误
 * 5. super_admin 允许 companyId 为 undefined
 * 
 * 禁止 API 自行查询 user_roles 或 user_companies 表，必须使用此模块。
 */

import { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export type UserRole = "super_admin" | "admin" | "staff" | "factory" | "filler"

export interface UserContext {
  userId: string
  role: UserRole
  companyId?: string
}

/**
 * 获取用户上下文（唯一可信的权限入口）
 * 
 * @param req NextRequest 或 Request 对象
 * @returns UserContext 对象，包含 userId、role 和可选的 companyId
 * @throws 如果用户未登录、权限不足或非 super_admin 缺少 company_id，会抛出错误
 */
export async function getUserContext(req: NextRequest | Request): Promise<UserContext> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("服务器配置错误：缺少 Supabase 环境变量")
  }

  // 1. 从 Supabase Auth session 中获取 userId
  const cookieStore = await cookies()
  const supabaseClient = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
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
    throw new Error("用户未登录")
  }

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
    throw new Error("权限不足：无法获取用户角色")
  }

  const role = roleData.role as UserRole

  // 3. 如果 role ≠ super_admin，必须从 user_companies 获取 company_id
  if (role !== "super_admin") {
    const { data: companyData, error: companyError } = await adminClient
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .single()

    // 如果没有主公司，尝试获取第一个公司
    let companyId: string | undefined
    if (companyError || !companyData) {
      const { data: firstCompany } = await adminClient
        .from("user_companies")
        .select("company_id")
        .eq("user_id", userId)
        .limit(1)
        .single()

      if (firstCompany) {
        companyId = firstCompany.company_id
      }
    } else {
      companyId = companyData.company_id
    }

    // 如果查不到 company_id，直接抛出错误
    if (!companyId) {
      throw new Error("权限不足：用户未关联任何公司")
    }

    return {
      userId,
      role,
      companyId,
    }
  }

  // 4. super_admin 允许 companyId 为 undefined
  return {
    userId,
    role,
    companyId: undefined,
  }
}
