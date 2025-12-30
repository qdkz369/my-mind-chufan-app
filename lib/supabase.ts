import { createClient } from "@supabase/supabase-js"

// 设置后备值：如果 process.env 为空，直接使用字符串初始化
const FALLBACK_SUPABASE_URL = "https://gjlhcpfvjgqabqanvgmu.supabase.co"
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_OQSB-t8qr1xO0WRcpVSIZA_O4RFkAHQ"

// 优先使用环境变量，如果为空则使用后备值
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY

// 添加调试日志
console.log('[Supabase] 初始化配置:')
console.log('[Supabase] URL:', supabaseUrl === FALLBACK_SUPABASE_URL ? '使用后备值' : '使用环境变量')
console.log('[Supabase] Key:', supabaseAnonKey === FALLBACK_SUPABASE_ANON_KEY ? '使用后备值' : '使用环境变量（已隐藏）')

// 检查配置是否有效
const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.trim() !== "" &&
  supabaseAnonKey.trim() !== ""
)

if (isSupabaseConfigured) {
  console.log('[Supabase] 客户端初始化成功')
} else {
  console.error('[Supabase] 客户端配置失败:', {
    url: supabaseUrl || '未配置',
    key: supabaseAnonKey ? '已配置（已隐藏）' : '未配置'
  })
}

// 创建客户端（使用环境变量或后备值）
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// 导出配置状态（供其他模块检查）
export { isSupabaseConfigured }

