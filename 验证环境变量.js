// 临时验证脚本：检查环境变量是否被读取
// 运行: node 验证环境变量.js

require('dotenv').config({ path: '.env.local' })

console.log('=== 环境变量检查 ===')
console.log('SUPABASE_SERVICE_ROLE_KEY 存在:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('SUPABASE_SERVICE_ROLE_KEY 长度:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0)
console.log('SUPABASE_SERVICE_ROLE_KEY 前10字符:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || 'N/A')

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('✅ 环境变量已正确读取')
} else {
  console.log('❌ 环境变量未读取，请检查 .env.local 文件')
}


