/**
 * 环境变量测试脚本
 * 使用方法：node scripts/test-env-vars.js
 */

// 加载 .env.local 文件
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        process.env[key.trim()] = value
      }
    }
  })
  console.log('✅ 已加载 .env.local 文件')
} else {
  console.log('⚠️  未找到 .env.local 文件，将使用系统环境变量')
}

console.log('='.repeat(60))
console.log('环境变量测试')
console.log('='.repeat(60))
console.log('')

// 检查必需的环境变量
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const optionalVars = [
  'NEXT_PUBLIC_AMAP_SECURITY_KEY',
]

let hasError = false

// 测试必需变量
console.log('📋 检查必需环境变量：')
console.log('')

requiredVars.forEach((varName) => {
  const value = process.env[varName]
  if (!value) {
    console.log(`❌ ${varName}: 未配置`)
    hasError = true
  } else {
    // 隐藏敏感信息，只显示前10个字符和后5个字符
    const displayValue = value.length > 20 
      ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
      : value
    console.log(`✅ ${varName}: ${displayValue}`)
    
    // 验证格式
    if (varName === 'NEXT_PUBLIC_SUPABASE_URL') {
      if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
        console.log(`   ⚠️  警告: URL 格式可能不正确`)
      }
    }
    
    if (varName.includes('KEY') && !varName.includes('AMAP')) {
      // JWT Token 应该有3个部分（用.分隔）
      const parts = value.split('.')
      if (parts.length !== 3) {
        console.log(`   ⚠️  警告: Token 格式可能不正确（应该有3个部分）`)
      }
    }
  }
})

console.log('')
console.log('📋 检查可选环境变量：')
console.log('')

optionalVars.forEach((varName) => {
  const value = process.env[varName]
  if (!value) {
    console.log(`⚠️  ${varName}: 未配置（可选）`)
  } else {
    const displayValue = value.length > 20 
      ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
      : value
    console.log(`✅ ${varName}: ${displayValue}`)
  }
})

console.log('')
console.log('='.repeat(60))

// 测试 Supabase 连接
console.log('')
console.log('🔗 测试 Supabase 连接：')
console.log('')

async function testSupabaseConnection() {
  try {
    const { createClient } = require('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('❌ 无法测试：缺少 Supabase 配置')
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 尝试一个简单的查询（检查连接）
    const { data, error } = await supabase.from('user_roles').select('count').limit(1)
    
    if (error) {
      console.log(`❌ 连接失败: ${error.message}`)
      console.log(`   错误代码: ${error.code || 'N/A'}`)
      if (error.code === 'PGRST116') {
        console.log('   提示: 表可能不存在，但连接正常')
      }
    } else {
      console.log('✅ Supabase 连接成功')
    }
  } catch (err) {
    console.log(`❌ 测试失败: ${err.message}`)
  }
}

// 运行测试
testSupabaseConnection().then(() => {
  console.log('')
  console.log('='.repeat(60))
  console.log('')
  
  if (hasError) {
    console.log('❌ 测试失败：有必需的环境变量未配置')
    console.log('   请检查 .env.local 文件')
    process.exit(1)
  } else {
    console.log('✅ 所有必需的环境变量都已配置')
    console.log('')
    console.log('💡 提示：')
    console.log('   - 如果 Supabase 连接失败，请检查密钥是否正确')
    console.log('   - 如果表查询失败，可能是 RLS 策略问题，但连接正常')
    console.log('   - 重启开发服务器后，环境变量才会生效')
    process.exit(0)
  }
})
