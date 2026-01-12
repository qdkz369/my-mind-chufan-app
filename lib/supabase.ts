import { createClient, SupabaseClient } from "@supabase/supabase-js"

// 从环境变量读取配置，如果未配置则抛出错误
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL")
  if (!supabaseAnonKey) missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  
  const errorMsg = `[Supabase 配置错误] 缺少必需的环境变量: ${missingVars.join(", ")}\n请在 .env.local 文件中配置这些变量。`
  
  if (typeof window === 'undefined') {
    // 服务器端：抛出错误
    throw new Error(errorMsg)
  } else {
    // 客户端：记录错误但不抛出（避免页面崩溃）
    console.error(errorMsg)
  }
}

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
    const errorMsg = '[Supabase] 配置无效：缺少必需的环境变量'
    if (typeof window === 'undefined') {
      // 服务器端：抛出错误
      throw new Error(errorMsg)
    } else {
      // 客户端：记录错误并返回 null
      console.error(errorMsg)
      return null
    }
  }

  try {
    return createClient(supabaseUrl!, supabaseAnonKey!, {
      // 确保在 SSR 环境中不会访问浏览器 API
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined',
        detectSessionInUrl: typeof window !== 'undefined',
      },
      // 启用 Realtime（WebSocket）支持
      realtime: {
        params: {
          eventsPerSecond: 10, // 限制每秒事件数，避免过载
        },
      },
      // 全局配置
      global: {
        headers: {
          'x-client-info': 'my-mind-chufan-app',
        },
      },
    })
  } catch (error) {
    console.error('[Supabase] 创建客户端失败:', error)
    return null
  }
}

// 导出客户端（在模块级别创建，确保单例）
export const supabase = createSupabaseClient()

// 导出配置状态（供其他模块检查）
export { isSupabaseConfigured }

