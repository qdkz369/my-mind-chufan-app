// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，后续必须迁移到 Anon Key + RLS

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * PATCH: 审核产品库条目
 * 请求体：
 * - id: 产品ID（必需）
 * - is_approved: 是否审核通过（true/false）
 * - approved_by: 审核人ID（可选）
 * - rejection_reason: 拒绝原因（如果拒绝，可选）
 */
export async function PATCH(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      console.error("[产品库审核API] Supabase URL 或密钥未配置")
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
    const { id, is_approved, approved_by, rejection_reason } = body

    if (!id || is_approved === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "id 和 is_approved 为必填项",
        },
        { status: 400 }
      )
    }

    // 构建更新数据
    const updateData: any = {
      is_approved,
      status: is_approved ? "active" : "rejected",
    }

    if (is_approved) {
      updateData.approved_at = new Date().toISOString()
      updateData.approved_by = approved_by || null
      updateData.rejection_reason = null
    } else {
      updateData.rejection_reason = rejection_reason || null
      updateData.approved_at = null
      updateData.approved_by = null
    }

    // 更新产品
    const { data, error } = await supabaseClient
      .from("equipment_catalog")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.error("[产品库审核API] 更新失败:", error)
      return NextResponse.json(
        {
          success: false,
          error: "审核失败",
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: is_approved ? "产品审核通过" : "产品审核已拒绝",
    })
  } catch (err: any) {
    console.error("[产品库审核API] 错误:", err)
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


