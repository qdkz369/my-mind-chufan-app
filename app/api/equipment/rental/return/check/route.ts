// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff, worker
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：设备归还检查流程

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentUserId } from "@/lib/multi-tenant"

/**
 * POST: 设备归还检查
 * 请求体：
 * - rental_order_id: 租赁订单ID（必需）
 * - return_condition: 归还状态（必需）：'good'（完好）、'normal_wear'（正常磨损）、'damaged'（损坏）、'lost'（丢失）
 * - return_photos: 归还照片URL数组（可选）
 * - damage_fee: 损坏赔偿费用（可选，如果 return_condition 为 'damaged' 时建议提供）
 * - notes: 备注（可选）
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
      rental_order_id,
      return_condition,
      return_photos = [],
      damage_fee,
      notes,
    } = body

    // 验证必需字段
    if (!rental_order_id || !return_condition) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "rental_order_id 和 return_condition 为必填项",
        },
        { status: 400 }
      )
    }

    // 验证归还状态
    if (!['good', 'normal_wear', 'damaged', 'lost'].includes(return_condition)) {
      return NextResponse.json(
        {
          success: false,
          error: "归还状态无效",
          details: "return_condition 必须是 'good'、'normal_wear'、'damaged' 或 'lost'",
        },
        { status: 400 }
      )
    }

    // 如果损坏，建议提供赔偿费用
    if (return_condition === 'damaged' && !damage_fee) {
      console.warn("[设备归还检查API] ⚠️ 设备损坏但未提供赔偿费用，将尝试从已有记录中获取")
    }

    // 验证订单是否存在
    const { data: order, error: orderError } = await supabaseClient
      .from("rental_orders")
      .select("id, order_status, equipment_id, restaurant_id, start_date")
      .eq("id", rental_order_id)
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

    // 验证订单状态（只有 active 状态的订单才能进行归还检查）
    if (order.order_status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: "订单状态不允许归还检查",
          details: `当前订单状态为 ${order.order_status}，只有租赁中的订单才能进行归还检查`,
        },
        { status: 400 }
      )
    }

    const equipmentId = order.equipment_id
    const damageFee = damage_fee || 0

    // 确定最终的状态值
    let recordStatus: string
    if (return_condition === 'lost') {
      recordStatus = 'lost'
    } else if (return_condition === 'damaged') {
      recordStatus = 'damaged'
    } else {
      recordStatus = 'returned'
    }

    // 获取当前用户ID
    const currentUserId = await getCurrentUserId(request)

    // 检查是否已存在 rental_records 记录
    const { data: existingRecord } = await supabaseClient
      .from("rental_records")
      .select("id, damage_fee")
      .eq("rental_order_id", rental_order_id)
      .eq("equipment_id", equipmentId)
      .maybeSingle()

    let recordId: string
    let finalDamageFee = damageFee

    // 如果已存在损坏记录，使用已有记录中的赔偿费用（如果未提供新值）
    if (existingRecord) {
      recordId = existingRecord.id
      if (!damage_fee && existingRecord.damage_fee) {
        finalDamageFee = parseFloat(existingRecord.damage_fee.toString())
      }

      // 更新现有记录
      const { error: updateError } = await supabaseClient
        .from("rental_records")
        .update({
          status: recordStatus,
          return_condition: return_condition,
          damage_fee: finalDamageFee,
          actual_end_date: new Date().toISOString().split("T")[0],
          notes: notes || `归还检查：${return_condition}。照片数量：${return_photos.length}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recordId)

      if (updateError) {
        console.error("[设备归还检查API] 更新租赁记录失败:", updateError)
        return NextResponse.json(
          {
            success: false,
            error: "更新租赁记录失败",
            details: updateError.message,
          },
          { status: 500 }
        )
      }
    } else {
      // 创建新记录
      const { data: newRecord, error: insertError } = await supabaseClient
        .from("rental_records")
        .insert({
          rental_order_id,
          equipment_id: equipmentId,
          restaurant_id: order.restaurant_id || null,
          status: recordStatus,
          return_condition: return_condition,
          damage_fee: finalDamageFee,
          actual_start_date: order.start_date || null,
          actual_end_date: new Date().toISOString().split("T")[0],
          notes: notes || `归还检查：${return_condition}。照片数量：${return_photos.length}`,
        })
        .select("id")
        .single()

      if (insertError) {
        console.error("[设备归还检查API] 创建租赁记录失败:", insertError)
        return NextResponse.json(
          {
            success: false,
            error: "创建租赁记录失败",
            details: insertError.message,
          },
          { status: 500 }
        )
      }

      recordId = newRecord.id
    }

    // 📝 记录租赁事件：设备归还检查
    const { error: eventError } = await supabaseClient
      .from("rental_events")
      .insert({
        rental_order_id,
        event_type: "equipment_return_checked",
        event_at: new Date().toISOString(),
        operator_id: currentUserId || null,
        meta: {
          equipment_id: equipmentId,
          return_condition,
          return_photos_count: return_photos.length,
          damage_fee: finalDamageFee,
          rental_record_id: recordId,
          notes: notes || null,
        },
      })

    if (eventError) {
      console.error("[设备归还检查API] 记录事件失败:", eventError)
      // 事件记录失败不影响主流程
    } else {
      console.log(`[设备归还检查API] 📝 租赁事件已记录：equipment_return_checked，订单ID: ${rental_order_id}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        rental_record_id: recordId,
        return_condition,
        damage_fee: finalDamageFee,
        status: recordStatus,
      },
      message: "设备归还检查完成",
    })
  } catch (err: any) {
    console.error("[设备归还检查API] 错误:", err)
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
