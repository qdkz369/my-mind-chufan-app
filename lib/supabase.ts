import { createClient } from "@supabase/supabase-js"

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

// 创建客户端（Supabase 客户端支持 SSR，不会在初始化时访问 window）
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      // 确保在 SSR 环境中不会访问浏览器 API
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined',
        detectSessionInUrl: typeof window !== 'undefined',
      },
    })
  : null

// 导出配置状态（供其他模块检查）
export { isSupabaseConfigured }

