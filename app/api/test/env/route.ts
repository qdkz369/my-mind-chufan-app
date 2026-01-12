// ACCESS_LEVEL: TEST (测试/工具API)
// ALLOWED_ROLES: 无（测试用途）
// CURRENT_KEY: Service Role Key (用于测试)
// TARGET_KEY: 无需迁移（测试API）
// 说明：测试API，用于测试环境变量配置，无需权限验证

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * GET: 测试环境变量配置
 * 访问: /api/test/env
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
    warnings: [],
  }

  // 检查环境变量是否存在
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const amapKey = process.env.NEXT_PUBLIC_AMAP_SECURITY_KEY

  // 1. 检查必需变量
  results.checks.required = {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
    SUPABASE_SERVICE_ROLE_KEY: !!serviceRoleKey,
  }

  // 2. 检查可选变量
  results.checks.optional = {
    NEXT_PUBLIC_AMAP_SECURITY_KEY: !!amapKey,
  }

  // 3. 验证格式
  if (supabaseUrl) {
    if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes(".supabase.co")) {
      results.warnings.push("NEXT_PUBLIC_SUPABASE_URL 格式可能不正确")
    }
  }

  if (supabaseAnonKey) {
    const parts = supabaseAnonKey.split(".")
    if (parts.length !== 3) {
      results.warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY 格式可能不正确（JWT Token 应该有3个部分）")
    }
  }

  if (serviceRoleKey) {
    const parts = serviceRoleKey.split(".")
    if (parts.length !== 3) {
      results.warnings.push("SUPABASE_SERVICE_ROLE_KEY 格式可能不正确（JWT Token 应该有3个部分）")
    }
  }

  // 4. 测试 Supabase 连接
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      
      // 尝试一个简单的查询
      const { data, error } = await supabase
        .from("user_roles")
        .select("count")
        .limit(1)

      if (error) {
        if (error.code === "PGRST116") {
          results.warnings.push("Supabase 连接正常，但 user_roles 表不存在（可能是 RLS 策略问题）")
        } else {
          results.errors.push(`Supabase 连接失败: ${error.message} (代码: ${error.code || "N/A"})`)
        }
      } else {
        results.checks.supabaseConnection = true
      }
    } catch (err: any) {
      results.errors.push(`Supabase 连接测试失败: ${err.message}`)
    }
  } else {
    results.errors.push("无法测试 Supabase 连接：缺少配置")
  }

  // 5. 测试 Service Role Key（如果配置了）
  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })

      // 尝试一个简单的查询（使用 Service Role Key 应该能绕过 RLS）
      const { data, error } = await supabaseAdmin
        .from("user_roles")
        .select("count")
        .limit(1)

      if (error) {
        if (error.code === "PGRST116") {
          results.warnings.push("Service Role Key 配置正常，但 user_roles 表不存在")
        } else {
          results.warnings.push(`Service Role Key 测试失败: ${error.message}`)
        }
      } else {
        results.checks.serviceRoleKey = true
      }
    } catch (err: any) {
      results.warnings.push(`Service Role Key 测试失败: ${err.message}`)
    }
  }

  // 汇总结果
  const allRequiredPresent = Object.values(results.checks.required).every((v) => v === true)
  const hasErrors = results.errors.length > 0

  results.summary = {
    allRequiredPresent,
    hasErrors,
    hasWarnings: results.warnings.length > 0,
    status: allRequiredPresent && !hasErrors ? "success" : hasErrors ? "error" : "warning",
  }

  return NextResponse.json(results, {
    status: results.summary.status === "error" ? 500 : 200,
  })
}
