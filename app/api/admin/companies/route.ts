// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: super_admin, platform_admin, company_admin
// 多租户：super_admin 可查全部；platform_admin/company_admin 仅能查本公司

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取公司列表（带多租户隔离）
 * 返回每个公司的 user_count、permissions_count、fuel_types_count
 */
export async function GET(request: Request) {
  try {
    const userContext = await getUserContext(request)
    if (!userContext) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "服务器配置错误", details: "缺少环境变量" },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let companyIds: string[] | null = null
    if (userContext.role !== "super_admin") {
      if (!userContext.companyId) {
        return NextResponse.json({
          success: true,
          data: [],
        })
      }
      companyIds = [userContext.companyId]
    }

    const companiesQuery = supabaseAdmin
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false })

    const { data: companies, error: companiesError } = companyIds
      ? await companiesQuery.in("id", companyIds)
      : await companiesQuery

    if (companiesError) {
      console.error("[admin/companies] 加载失败:", companiesError)
      return NextResponse.json(
        { success: false, error: "加载公司列表失败", details: companiesError.message },
        { status: 500 }
      )
    }

    const companiesWithStats = await Promise.all(
      (companies || []).map(async (company) => {
        const [userCountRes, permRes, fuelRes] = await Promise.all([
          supabaseAdmin
            .from("user_companies")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabaseAdmin
            .from("company_permissions")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .eq("enabled", true),
          supabaseAdmin
            .from("company_fuel_types")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .eq("enabled", true),
        ])

        return {
          ...company,
          user_count: userCountRes.count ?? 0,
          permissions_count: permRes.count ?? 0,
          fuel_types_count: fuelRes.count ?? 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: companiesWithStats,
    })
  } catch (err: any) {
    console.error("[admin/companies] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器内部错误", details: err.message },
      { status: 500 }
    )
  }
}
