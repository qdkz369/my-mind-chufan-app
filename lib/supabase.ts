import { createClient, SupabaseClient } from "@supabase/supabase-js"

// 设置后备值：如果 process.env 为空，直接使用字符串初始化
const FALLBACK_SUPABASE_URL = "https://gjlhcpfvjgqabqanvgmu.supabase.co"
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_OQSB-t8qr1xO0WRcpVSIZA_O4RFkAHQ"

// 优先使用环境变量，如果为空则使用后备值
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY

// 检查配置是否有效
const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.trim() !== "" &&
  supabaseAnonKey.trim() !== ""
)

// 创建客户端函数（确保在服务器端和客户端都能正确初始化）
function createSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    if (typeof window === 'undefined') {
      // 服务器端：记录警告但不抛出错误
      console.warn('[Supabase] 服务器端：配置无效，使用后备值')
    }
    // 即使配置无效，也尝试使用后备值创建客户端
    try {
      return createClient(FALLBACK_SUPABASE_URL, FALLBACK_SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    } catch (error) {
      console.error('[Supabase] 创建客户端失败:', error)
      return null
    }
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      // 确保在 SSR 环境中不会访问浏览器 API
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined',
        detectSessionInUrl: typeof window !== 'undefined',
      },
    })
  } catch (error) {
    console.error('[Supabase] 创建客户端失败:', error)
    // 如果创建失败，尝试使用后备值
    try {
      return createClient(FALLBACK_SUPABASE_URL, FALLBACK_SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    } catch (fallbackError) {
      console.error('[Supabase] 使用后备值创建客户端也失败:', fallbackError)
      return null
    }
  }
}

// 导出客户端（在模块级别创建，确保单例）
export const supabase = createSupabaseClient()

// 导出配置状态（供其他模块检查）
export { isSupabaseConfigured }

