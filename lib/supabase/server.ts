/**
 * Supabase 服务器端客户端
 * 阶段 2B-4：权限与审计正式收口
 * 
 * 用于在 API 路由中获取已认证的用户信息
 */

import { createClient } from "@supabase/supabase-js"
import { createServerClient as createSSRClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * 创建服务器端 Supabase 客户端（支持认证）
 * 当前阶段：默认放行，如果无法获取认证信息也继续执行
 */
export async function supabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase 环境变量未配置")
  }

  try {
    // 尝试使用 @supabase/ssr 创建支持 cookie 的客户端（如果可能）
    const cookieStore = await cookies()
    
    return createSSRClient(supabaseUrl, supabaseAnonKey, {
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
    })
  } catch (error) {
    // 如果无法创建 SSR 客户端（如 cookies 不可用），回退到基础客户端
    // 当前阶段：默认放行，不阻断执行
    console.warn("[supabaseServer] 无法创建 SSR 客户端，使用基础客户端:", error)
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
}
