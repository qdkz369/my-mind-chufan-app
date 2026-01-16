// ACCESS_LEVEL: SYSTEM_LEVEL
// ALLOWED_ROLES: super_admin
// CURRENT_KEY: Service Role Key
// 说明：只能由 super_admin 调用，用于更新供应商的功能权限

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST: 更新供应商的功能权限和燃料品种
 * @param companyId - 公司ID
 * @param permissions - 功能权限列表（permission_key 数组）
 * @param fuelTypes - 燃料品种列表（fuel_type 数组，可选）
 */
export async function POST(request: Request) {
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

    const body = await request.json()
    const { companyId, permissions = [], fuelTypes = [] } = body

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少公司ID参数",
        },
        { status: 400 }
      )
    }

    // 验证公司是否存在
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        {
          success: false,
          error: "公司不存在",
          details: companyError?.message,
        },
        { status: 404 }
      )
    }

    // 1. 更新功能权限
    // 先删除该公司的所有现有权限
    const { error: deletePermissionsError } = await supabaseAdmin
      .from("company_permissions")
      .delete()
      .eq("company_id", companyId)

    if (deletePermissionsError) {
      console.error("[更新权限API] 删除旧权限失败:", deletePermissionsError)
      return NextResponse.json(
        {
          success: false,
          error: "删除旧权限失败",
          details: deletePermissionsError.message,
        },
        { status: 500 }
      )
    }

    // 批量插入新权限（如果有）
    if (permissions.length > 0) {
      const permissionsData = permissions.map((permissionKey: string) => ({
        company_id: companyId,
        permission_key: permissionKey,
        enabled: true,
      }))

      const { error: insertPermissionsError } = await supabaseAdmin
        .from("company_permissions")
        .insert(permissionsData)

      if (insertPermissionsError) {
        console.error("[更新权限API] 插入新权限失败:", insertPermissionsError)
        return NextResponse.json(
          {
            success: false,
            error: "保存权限失败",
            details: insertPermissionsError.message,
          },
          { status: 500 }
        )
      }
    }

    // 2. 更新燃料品种（如果提供了）
    if (Array.isArray(fuelTypes)) {
      // 先删除该公司的所有现有燃料品种
      const { error: deleteFuelTypesError } = await supabaseAdmin
        .from("company_fuel_types")
        .delete()
        .eq("company_id", companyId)

      if (deleteFuelTypesError) {
        console.error("[更新权限API] 删除旧燃料品种失败:", deleteFuelTypesError)
        // 不中断流程，继续执行
      }

      // 批量插入新燃料品种（如果有）
      if (fuelTypes.length > 0) {
        const fuelTypesData = fuelTypes.map((fuelType: string) => ({
          company_id: companyId,
          fuel_type: fuelType,
          enabled: true,
        }))

        const { error: insertFuelTypesError } = await supabaseAdmin
          .from("company_fuel_types")
          .insert(fuelTypesData)

        if (insertFuelTypesError) {
          console.error("[更新权限API] 插入新燃料品种失败:", insertFuelTypesError)
          // 不中断流程，但记录错误
          return NextResponse.json(
            {
              success: true,
              warning: "功能权限已保存，但燃料品种保存失败",
              error: insertFuelTypesError.message,
            },
            { status: 200 }
          )
        }
      }
    }

    console.log(`[更新权限API] ✅ 成功更新公司 ${companyId} 的权限：${permissions.length} 个功能模块，${fuelTypes.length} 个燃料品种`)

    return NextResponse.json({
      success: true,
      message: `权限已更新：${permissions.length} 个功能模块，${fuelTypes.length} 个燃料品种`,
      permissionsCount: permissions.length,
      fuelTypesCount: fuelTypes.length,
    })
  } catch (err: any) {
    console.error("[更新权限API] 错误:", err)
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
