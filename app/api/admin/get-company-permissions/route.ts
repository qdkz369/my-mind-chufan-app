// ACCESS_LEVEL: SYSTEM_LEVEL
// ALLOWED_ROLES: super_admin
// CURRENT_KEY: Service Role Key
// 说明：只能由 super_admin 调用，用于查询供应商的功能权限和燃料品种

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * GET: 查询供应商的功能权限和燃料品种
 * @param companyId - 公司ID（可选，如果提供则查询单个公司，否则查询所有公司）
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "缺少必要的环境变量",
        },
        { status: 500 }
      )
    }

    // 使用 Service Role Key 创建 Admin 客户端
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")

    if (companyId) {
      // 查询单个公司的权限
      // 加载功能权限
      const { data: permissionsData, error: permissionsError } = await supabaseAdmin
        .from("company_permissions")
        .select("permission_key")
        .eq("company_id", companyId)
        .eq("enabled", true)

      if (permissionsError) {
        console.error("[查询权限API] 加载权限失败:", permissionsError)
        return NextResponse.json(
          {
            success: false,
            error: "加载权限失败",
            details: permissionsError.message,
          },
          { status: 500 }
        )
      }

      // 加载燃料品种
      const { data: fuelTypesData, error: fuelTypesError } = await supabaseAdmin
        .from("company_fuel_types")
        .select("fuel_type")
        .eq("company_id", companyId)
        .eq("enabled", true)

      if (fuelTypesError) {
        console.error("[查询权限API] 加载燃料品种失败:", fuelTypesError)
        return NextResponse.json(
          {
            success: false,
            error: "加载燃料品种失败",
            details: fuelTypesError.message,
          },
          { status: 500 }
        )
      }

      const permissions = (permissionsData || []).map(p => p.permission_key)
      const fuelTypes = (fuelTypesData || []).map(f => f.fuel_type)

      return NextResponse.json({
        success: true,
        permissions,
        fuelTypes,
        permissionsCount: permissions.length,
        fuelTypesCount: fuelTypes.length,
      })
    } else {
      // 查询所有公司的权限统计
      // 获取所有公司
      const { data: companies, error: companiesError } = await supabaseAdmin
        .from("companies")
        .select("id, name")

      if (companiesError) {
        console.error("[查询权限API] 加载公司列表失败:", companiesError)
        return NextResponse.json(
          {
            success: false,
            error: "加载公司列表失败",
            details: companiesError.message,
          },
          { status: 500 }
        )
      }

      // 为每个公司查询权限数量
      const companiesWithPermissions = await Promise.all(
        (companies || []).map(async (company) => {
          // 查询权限数量
          const { count: permCount, error: permError } = await supabaseAdmin
            .from("company_permissions")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .eq("enabled", true)

          // 查询燃料品种数量
          const { count: fuelCount, error: fuelError } = await supabaseAdmin
            .from("company_fuel_types")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id)
            .eq("enabled", true)

          return {
            companyId: company.id,
            companyName: company.name,
            permissionsCount: permError ? 0 : (permCount || 0),
            fuelTypesCount: fuelError ? 0 : (fuelCount || 0),
          }
        })
      )

      return NextResponse.json({
        success: true,
        companies: companiesWithPermissions,
      })
    }
  } catch (err: any) {
    console.error("[查询权限API] 错误:", err)
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
        details: err.message,
      },
      { status: 500 }
    )
  }
}