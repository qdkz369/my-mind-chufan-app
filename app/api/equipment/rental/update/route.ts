// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，后续必须迁移到 Anon Key + RLS

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentCompanyId, verifyCompanyAccess, getCurrentUserId } from "@/lib/multi-tenant"

/**
 * PATCH: 更新租赁订单状态
 * 请求体：
 * - id: 订单ID
 * - order_status: 订单状态（pending, confirmed, active, completed, cancelled）
 * - payment_status: 支付状态（可选）
 */
export async function PATCH(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      console.error("[租赁订单更新API] Supabase URL 或密钥未配置")
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
    const { 
      id, 
      order_status, 
      payment_status,
      is_signed,
      setup_photo,
      funding_type,
      provider_id,
    } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少订单ID",
        },
        { status: 400 }
      )
    }

    // 🔒 多租户隔离：验证用户是否有权限更新此订单
    const currentUserId = await getCurrentUserId(request)
    const currentCompanyId = await getCurrentCompanyId(request)
    
    // 先获取订单的 provider_id
    const { data: existingOrder } = await supabaseClient
      .from("rental_orders")
      .select("provider_id")
      .eq("id", id)
      .single()
    
    if (existingOrder?.provider_id && currentUserId && currentCompanyId) {
      const hasAccess = await verifyCompanyAccess(currentUserId, existingOrder.provider_id)
      if (!hasAccess && existingOrder.provider_id !== currentCompanyId) {
        return NextResponse.json(
          {
            success: false,
            error: "无权更新此订单",
            details: "此订单属于其他供应商",
          },
          { status: 403 }
        )
      }
    }

    // 构建更新数据
    const updateData: any = {}
    if (order_status !== undefined) {
      updateData.order_status = order_status
    }
    if (payment_status !== undefined) {
      updateData.payment_status = payment_status
    }
    if (is_signed !== undefined) {
      updateData.is_signed = is_signed
    }
    if (setup_photo !== undefined) {
      updateData.setup_photo = setup_photo
    }
    if (funding_type !== undefined) {
      updateData.funding_type = funding_type
    }
    if (provider_id !== undefined) {
      updateData.provider_id = provider_id
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "没有要更新的字段",
        },
        { status: 400 }
      )
    }

    // 更新订单
    const { data, error } = await supabaseClient
      .from("rental_orders")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.error("[租赁订单更新API] 更新失败:", error)
      return NextResponse.json(
        {
          success: false,
          error: "更新订单失败",
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: "订单更新成功",
    })
  } catch (err: any) {
    console.error("[租赁订单更新API] 错误:", err)
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

