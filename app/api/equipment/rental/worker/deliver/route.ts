// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: worker
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：工人端提交设备配送验证信息

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * POST: 工人提交设备配送验证信息
 * 请求体：
 * - order_id: 订单ID（必需）
 * - worker_id: 工人ID（必需）
 * - setup_photo: 设备到场照片URL数组（必需）
 * - delivery_verification: 配送验证信息（JSONB，包含设备种类、送达时间、客户确认签收等）
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "Supabase 密钥未配置",
        },
        { status: 500 }
      )
    }

    const supabaseClient = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })
      : createClient(supabaseUrl, anonKey!, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        })

    const body = await request.json()
    const {
      order_id,
      worker_id,
      setup_photo = [],
      delivery_verification = {},
    } = body

    // 验证必需字段
    if (!order_id || !worker_id) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "order_id 和 worker_id 为必填项",
        },
        { status: 400 }
      )
    }

    // 验证订单是否存在
    const { data: order, error: orderError } = await supabaseClient
      .from("rental_orders")
      .select("*")
      .eq("id", order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        {
          success: false,
          error: "订单不存在",
          details: orderError?.message || "未找到指定订单",
        },
        { status: 404 }
      )
    }

    // 更新订单信息
    const updateData: any = {
      worker_id,
      setup_photo: setup_photo || [],
      delivery_verification: {
        equipment_type: delivery_verification.equipment_type || order.equipment?.name || "未知",
        delivery_time: delivery_verification.delivery_time || new Date().toISOString(),
        customer_confirmed: delivery_verification.customer_confirmed || false,
        customer_signature: delivery_verification.customer_signature || null,
        notes: delivery_verification.notes || null,
        ...delivery_verification,
      },
      is_signed: delivery_verification.customer_confirmed || false,
      delivery_time: delivery_verification.delivery_time || new Date().toISOString(),
    }

    // 如果客户已确认签收，更新订单状态为 active（租赁中）
    if (delivery_verification.customer_confirmed) {
      updateData.order_status = "active"
    }

    const { data: updatedOrder, error: updateError } = await supabaseClient
      .from("rental_orders")
      .update(updateData)
      .eq("id", order_id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[工人端配送API] 更新失败:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: "更新失败",
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    // 🔧 设备状态机：租赁开始（客户确认签收后），将设备状态改为 in_use
    if (delivery_verification.customer_confirmed && updatedOrder?.equipment_id) {
      const { error: equipmentUpdateError } = await supabaseClient
        .from("equipment")
        .update({
          rental_status: "in_use",
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedOrder.equipment_id)
        .eq("current_rental_order_id", order_id) // 确保是当前订单占用的设备

      if (equipmentUpdateError) {
        console.error("[工人端配送API] 更新设备状态失败:", equipmentUpdateError)
        // 注意：即使设备状态更新失败，订单状态已更新，这里只记录错误
      } else {
        console.log(`[工人端配送API] ✅ 设备状态已更新：${updatedOrder.equipment_id} -> in_use，订单ID: ${order_id}`)
      }

      // 📝 记录租赁事件：开始租赁
      const { error: eventError } = await supabaseClient
        .from("rental_events")
        .insert({
          rental_order_id: order_id,
          event_type: "rental_started",
          event_at: new Date().toISOString(),
          operator_id: worker_id || null,
          meta: {
            equipment_id: updatedOrder.equipment_id,
            delivery_time: delivery_verification.delivery_time || new Date().toISOString(),
            customer_confirmed: true,
            setup_photo_count: (setup_photo || []).length,
          },
        })

      if (eventError) {
        console.error("[工人端配送API] 记录事件失败:", eventError)
        // 事件记录失败不影响主流程
      } else {
        console.log(`[工人端配送API] 📝 租赁事件已记录：rental_started，订单ID: ${order_id}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "配送验证信息提交成功",
    })
  } catch (err: any) {
    console.error("[工人端配送API] 错误:", err)
    return NextResponse.json(
      {
        success: false,
        error: "服务器错误",
        details: err.message,
      },
      { status: 500 }
    )
  }
}
