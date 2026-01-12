// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，后续必须迁移到 Anon Key + RLS

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { validateStatusTransition, logStatusChange } from "@/lib/status-manager"
import { getCurrentCompanyId, verifyCompanyAccess } from "@/lib/multi-tenant"

/**
 * POST: 统一的状态变更接口
 * 请求体：
 * - table: 表名（rental_orders, repairs, equipment_catalog）
 * - record_id: 记录ID
 * - new_status: 新状态
 * - reason: 变更原因（可选）
 * - user_id: 操作人ID（可选，从 token 获取）
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      console.error("[状态变更API] Supabase URL 或密钥未配置")
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置",
        },
        { status: 500 }
      )
    }

    let supabaseClient: any

    if (serviceRoleKey) {
      supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    } else if (anonKey) {
      supabaseClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置",
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { table, record_id, new_status, reason, user_id } = body

    // 验证必需字段
    if (!table || !record_id || !new_status) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "table, record_id, new_status 为必填项",
        },
        { status: 400 }
      )
    }

    // 获取当前记录
    const { data: currentRecord, error: fetchError } = await supabaseClient
      .from(table)
      .select("*")
      .eq("id", record_id)
      .single()

    if (fetchError || !currentRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "记录不存在",
          details: fetchError?.message,
        },
        { status: 404 }
      )
    }

    // 确定状态字段名
    const statusField = table === "rental_orders" ? "order_status" : "status"

    // 验证状态流转
    const validation = validateStatusTransition(
      table,
      currentRecord[statusField],
      new_status
    )

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "状态流转不合法",
          details: validation.reason,
          current_status: currentRecord[statusField],
          new_status,
        },
        { status: 400 }
      )
    }

    // 多租户权限检查
    const companyId = await getCurrentCompanyId(request)
    if (companyId && currentRecord.provider_id) {
      const hasAccess = await verifyCompanyAccess(user_id || "", companyId)
      if (!hasAccess && currentRecord.provider_id !== companyId) {
        return NextResponse.json(
          {
            success: false,
            error: "无权访问此记录",
            details: "此记录属于其他供应商",
          },
          { status: 403 }
        )
      }
    }

    // 更新状态
    const updateData: any = { [statusField]: new_status }
    const { data: updatedRecord, error: updateError } = await supabaseClient
      .from(table)
      .update(updateData)
      .eq("id", record_id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[状态变更API] 更新失败:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: "状态更新失败",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    // 记录状态变更日志
    await logStatusChange({
      table_name: table,
      record_id,
      old_status: currentRecord[statusField],
      new_status,
      changed_by: user_id || "system",
      reason: reason || null,
    })

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: "状态更新成功",
    })
  } catch (err: any) {
    console.error("[状态变更API] 错误:", err)
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


