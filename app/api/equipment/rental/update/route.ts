// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，后续必须迁移到 Anon Key + RLS

import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { verifyCompanyAccess } from "@/lib/multi-tenant"

/**
 * PATCH: 更新租赁订单状态
 * 请求体：
 * - id: 订单ID
 * - order_status: 订单状态（pending, confirmed, active, completed, cancelled）
 * - payment_status: 支付状态（可选）
 */
export async function PATCH(request: NextRequest) {
  try {
    // P0修复：强制使用统一用户上下文获取用户身份和权限
    let userContext
    try {
      userContext = await getUserContext(request)
      if (!userContext) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      if (userContext.role === "super_admin") {
        console.log("[租赁订单更新API] Super Admin 访问，跳过多租户过滤")
      }
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      if (errorMessage.includes("未登录")) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: errorMessage,
        },
        { status: 403 }
      )
    }

    // P0修复：强制验证 companyId（super_admin 除外）
    if (!userContext.companyId && userContext.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "用户未关联任何公司",
        },
        { status: 403 }
      )
    }
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

    let supabaseClient

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

    // 确保 supabaseClient 已初始化
    if (!supabaseClient) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 客户端初始化失败",
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

    // 🔒 多租户隔离：验证用户是否有权限更新此订单（super_admin 跳过）
    const currentUserId = userContext?.userId
    const currentCompanyId = userContext?.companyId
    
    // 获取订单信息（provider_id、order_status、equipment_id）
    const { data: existingOrder, error: fetchError } = await supabaseClient
      .from("rental_orders")
      .select("provider_id, order_status, equipment_id")
      .eq("id", id)
      .single()
    
    if (fetchError || !existingOrder) {
      console.error("[租赁订单更新API] 获取订单失败:", fetchError)
      return NextResponse.json(
        {
          success: false,
          error: "订单不存在",
          details: fetchError?.message || "无法获取订单信息",
        },
        { status: 404 }
      )
    }
    
    // 验证权限（super_admin 跳过）
    if (existingOrder.provider_id && currentUserId && currentCompanyId && userContext?.role !== "super_admin") {
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

    // 获取订单当前状态和设备信息（用于状态机判断）
    const previousOrderStatus = existingOrder.order_status
    const equipmentId = existingOrder.equipment_id

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

    // 🔧 设备状态机：租赁结束（订单状态变为 completed 或 cancelled 时）
    // 清空 current_rental_order_id，将设备状态改回 available
    const orderEnded =
      (order_status === "completed" || order_status === "cancelled") &&
      previousOrderStatus &&
      previousOrderStatus !== "completed" &&
      previousOrderStatus !== "cancelled"

    if (orderEnded && equipmentId) {
      const { error: equipmentUpdateError } = await supabaseClient
        .from("equipment")
        .update({
          rental_status: "available",
          current_rental_order_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", equipmentId)
        .eq("current_rental_order_id", id) // 确保是当前订单占用的设备

      if (equipmentUpdateError) {
        console.error("[租赁订单更新API] 更新设备状态失败:", equipmentUpdateError)
        // 注意：即使设备状态更新失败，订单状态已更新，这里只记录错误
      } else {
        const actionText = order_status === "completed" ? "租赁结束" : "订单取消"
        console.log(`[租赁订单更新API] ✅ 设备状态已更新：${equipmentId} -> available，订单ID: ${id}（${actionText}）`)
      }

      // 📝 记录租赁事件：结束租赁
      const { error: eventError } = await supabaseClient
        .from("rental_events")
        .insert({
          rental_order_id: id,
          event_type: "rental_ended",
          event_at: new Date().toISOString(),
          operator_id: currentUserId || null,
          meta: {
            order_status: order_status,
            previous_status: previousOrderStatus,
            equipment_id: equipmentId,
            reason: order_status === "completed" ? "订单完成" : "订单取消",
          },
        })

      if (eventError) {
        console.error("[租赁订单更新API] 记录事件失败:", eventError)
        // 事件记录失败不影响主流程
      } else {
        const actionText = order_status === "completed" ? "租赁结束" : "订单取消"
        console.log(`[租赁订单更新API] 📝 租赁事件已记录：rental_ended，订单ID: ${id}（${actionText}）`)
      }
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

