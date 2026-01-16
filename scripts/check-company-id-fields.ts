/**
 * 检查数据表是否包含 company_id 字段
 * 用于供应商数据隔离功能
 * 
 * 使用方法：
 * 1. 确保项目根目录有 .env.local 文件，包含：
 *    NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
 *    SUPABASE_SERVICE_ROLE_KEY=你的Service Role Key
 * 2. 运行：npx tsx scripts/check-company-id-fields.ts
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

// 手动读取 .env.local 文件（不依赖 dotenv 包）
function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local")
    const envContent = readFileSync(envPath, "utf-8")
    const lines = envContent.split("\n")
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      // 跳过空行和注释
      if (!trimmedLine || trimmedLine.startsWith("#")) continue
      
      const [key, ...valueParts] = trimmedLine.split("=")
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim()
        // 移除引号（如果有）
        const cleanValue = value.replace(/^["']|["']$/g, "")
        process.env[key.trim()] = cleanValue
      }
    }
  } catch (error) {
    // 如果文件不存在，忽略错误（可能使用系统环境变量）
  }
}

// 加载 .env.local 文件
loadEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ 错误：缺少环境变量")
  console.error("")
  console.error("请确保项目根目录有 .env.local 文件，包含以下内容：")
  console.error("  NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL")
  console.error("  SUPABASE_SERVICE_ROLE_KEY=你的Service Role Key")
  console.error("")
  console.error("或者使用 SQL 脚本（推荐）：")
  console.error("  在 Supabase SQL Editor 中执行 migrations/20250122_check_company_id_fields.sql")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

interface TableCheckResult {
  tableName: string
  hasCompanyId: boolean
  columns?: string[]
  error?: string
}

async function checkTableHasColumn(tableName: string): Promise<TableCheckResult> {
  try {
    // 尝试查询表结构（通过查询一条记录来获取列信息）
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select("*")
      .limit(1)

    if (error) {
      // 如果表不存在，返回错误
      if (error.code === "42P01" || error.message.includes("does not exist")) {
        return {
          tableName,
          hasCompanyId: false,
          error: "表不存在",
        }
      }
      // 其他错误（如权限问题）
      return {
        tableName,
        hasCompanyId: false,
        error: error.message,
      }
    }

    // 检查返回的数据是否包含 company_id 字段
    if (data && data.length > 0) {
      const columns = Object.keys(data[0])
      const hasCompanyId = columns.includes("company_id")
      
      return {
        tableName,
        hasCompanyId,
        columns,
      }
    }

    // 表存在但没有数据，通过查询表结构来检查
    // 尝试插入一条空记录然后删除（仅用于检查结构）
    // 但更好的方法是直接查询 information_schema
    // 这里使用一个更安全的方法：尝试查询 company_id 字段
    const { error: columnError } = await supabaseAdmin
      .from(tableName)
      .select("company_id")
      .limit(0) // 不返回数据，只检查字段是否存在

    const hasCompanyId = !columnError || columnError.code !== "42703" // 42703 = column does not exist

    return {
      tableName,
      hasCompanyId,
    }
  } catch (err: any) {
    return {
      tableName,
      hasCompanyId: false,
      error: err.message,
    }
  }
}

async function main() {
  console.log("🔍 开始检查数据表的 company_id 字段...\n")

  // 需要检查的表
  const tablesToCheck = [
    "restaurants",
    "orders",
    "repair_orders",
    "delivery_orders",
    "workers",
    "devices",
    "service_points",
    "rental_orders",
    "device_rentals",
    "fuel_prices",
  ]

  const results: TableCheckResult[] = []

  for (const tableName of tablesToCheck) {
    const result = await checkTableHasColumn(tableName)
    results.push(result)
  }

  // 打印结果
  console.log("=".repeat(80))
  console.log("📊 检查结果清单\n")
  console.log("=".repeat(80))

  const tablesWithCompanyId: string[] = []
  const tablesWithoutCompanyId: string[] = []
  const tablesWithError: string[] = []

  results.forEach((result) => {
    if (result.error) {
      tablesWithError.push(result.tableName)
      console.log(`❌ ${result.tableName.padEnd(30)} - 错误: ${result.error}`)
    } else if (result.hasCompanyId) {
      tablesWithCompanyId.push(result.tableName)
      console.log(`✅ ${result.tableName.padEnd(30)} - 已包含 company_id 字段`)
    } else {
      tablesWithoutCompanyId.push(result.tableName)
      console.log(`⚠️  ${result.tableName.padEnd(30)} - ❌ 缺少 company_id 字段`)
    }
  })

  console.log("\n" + "=".repeat(80))
  console.log("📋 汇总\n")
  console.log(`✅ 已包含 company_id 字段的表 (${tablesWithCompanyId.length} 个):`)
  if (tablesWithCompanyId.length > 0) {
    tablesWithCompanyId.forEach((table) => console.log(`   - ${table}`))
  } else {
    console.log("   (无)")
  }

  console.log(`\n⚠️  缺少 company_id 字段的表 (${tablesWithoutCompanyId.length} 个):`)
  if (tablesWithoutCompanyId.length > 0) {
    tablesWithoutCompanyId.forEach((table) => console.log(`   - ${table}`))
    console.log("\n💡 建议：为这些表添加 company_id 字段以支持供应商数据隔离")
    console.log("   示例 SQL:")
    tablesWithoutCompanyId.forEach((table) => {
      console.log(`\n   -- 为 ${table} 表添加 company_id 字段`)
      console.log(`   ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;`)
      console.log(`   CREATE INDEX IF NOT EXISTS idx_${table}_company_id ON ${table}(company_id);`)
    })
  } else {
    console.log("   (无)")
  }

  if (tablesWithError.length > 0) {
    console.log(`\n❌ 检查失败的表 (${tablesWithError.length} 个):`)
    tablesWithError.forEach((table) => console.log(`   - ${table}`))
  }

  console.log("\n" + "=".repeat(80))
  console.log("✅ 检查完成\n")

  // 返回退出码
  if (tablesWithoutCompanyId.length > 0 || tablesWithError.length > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

main().catch((error) => {
  console.error("❌ 执行失败:", error)
  process.exit(1)
})
