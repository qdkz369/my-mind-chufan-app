// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff, worker
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：设备损坏上报与赔偿流程

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentUserId } from "@/lib/multi-tenant"

/**
 * POST: 设备损坏上报
 * 请求体：
 * - rental_order_id: 租赁订单ID（必需）
 * - equipment_id: 设备ID（必需）
 * - damage_type: 损坏类型（必需）：'minor'（轻微损坏）、'major'（严重损坏）、'total'（完全损坏）
 * - damage_description: 损坏描述（可选）
 * - damage_photos: 损坏照片URL数组（可选）
 * - estimated_fee: 预估赔偿金额（可选）
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
      equipment_id,
      damage_type,
      damage_description,
      damage_photos = [],
      estimated_fee,
    } = body

    // 验证必需字段
    if (!rental_order_id || !equipment_id || !damage_type) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必需字段",
          details: "rental_order_id、equipment_id 和 damage_type 为必填项",
        },
        { status: 400 }
      )
    }

    // 验证损坏类型
    if (!['minor', 'major', 'total'].includes(damage_type)) {
      return NextResponse.json(
        {
          success: false,
          error: "损坏类型无效",
          details: "damage_type 必须是 'minor'、'major' 或 'total'",
        },
        { status: 400 }
      )
    }

    // 验证订单是否存在
    const { data: order, error: orderError } = await supabaseClient
      .from("rental_orders")
      .select("id, order_status, equipment_id")
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

    // 验证设备是否属于该订单
    if (order.equipment_id !== equipment_id) {
      return NextResponse.json(
        {
          success: false,
          error: "设备与订单不匹配",
          details: "指定的设备不属于该订单",
        },
        { status: 400 }
      )
    }

    // 验证订单状态（只有 active 或 completed 状态的订单才能上报损坏）
    if (!['active', 'completed'].includes(order.order_status)) {
      return NextResponse.json(
        {
          success: false,
          error: "订单状态不允许上报损坏",
          details: `当前订单状态为 ${order.order_status}，只有租赁中或已完成的订单才能上报损坏`,
        },
        { status: 400 }
      )
    }

    // 计算赔偿费用（如果没有提供，根据损坏类型估算）
    let finalDamageFee = estimated_fee || 0
    if (!estimated_fee) {
      // 简单的赔偿费用计算逻辑（可根据实际业务调整）
      // 这里需要查询设备信息来计算
      const { data: equipment } = await supabaseClient
        .from("equipment")
        .select("monthly_rental_price, deposit_amount")
        .eq("id", equipment_id)
        .single()

      if (equipment) {
        const basePrice = parseFloat(equipment.monthly_rental_price || 0)
        const depositAmount = parseFloat(equipment.deposit_amount || 0)
        
        // 根据损坏类型估算赔偿金额
        switch (damage_type) {
          case 'minor':
            finalDamageFee = Math.max(basePrice * 0.1, depositAmount * 0.1) // 轻微损坏：10%折旧
            break
          case 'major':
            finalDamageFee = Math.max(basePrice * 0.5, depositAmount * 0.5) // 严重损坏：50%折旧
            break
          case 'total':
            finalDamageFee = depositAmount // 完全损坏：押金全扣
            break
        }
      }
    }

    // 获取当前用户ID
    const currentUserId = await getCurrentUserId(request)

    // 检查是否已存在 rental_records 记录
    const { data: existingRecord } = await supabaseClient
      .from("rental_records")
      .select("id, status")
      .eq("rental_order_id", rental_order_id)
      .eq("equipment_id", equipment_id)
      .maybeSingle()

    let recordId: string

    if (existingRecord) {
      // 更新现有记录
      const { data: updatedRecord, error: updateError } = await supabaseClient
        .from("rental_records")
        .update({
          status: 'damaged',
          return_condition: 'damaged',
          damage_fee: finalDamageFee,
          notes: damage_description || `损坏类型：${damage_type}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id)
        .select("id")
        .single()

      if (updateError) {
        console.error("[设备损坏上报API] 更新租赁记录失败:", updateError)
        return NextResponse.json(
          {
            success: false,
            error: "更新租赁记录失败",
            details: updateError.message,
          },
          { status: 500 }
        )
      }

      recordId = updatedRecord.id
    } else {
      // 创建新记录
      const { data: newRecord, error: insertError } = await supabaseClient
        .from("rental_records")
        .insert({
          rental_order_id,
          equipment_id,
          restaurant_id: order.restaurant_id || null,
          status: 'damaged',
          return_condition: 'damaged',
          damage_fee: finalDamageFee,
          notes: damage_description || `损坏类型：${damage_type}。照片数量：${damage_photos.length}`,
          actual_start_date: order.start_date || null,
        })
        .select("id")
        .single()

      if (insertError) {
        console.error("[设备损坏上报API] 创建租赁记录失败:", insertError)
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

    // 📝 记录租赁事件：设备损坏
    const { error: eventError } = await supabaseClient
      .from("rental_events")
      .insert({
        rental_order_id,
        event_type: "equipment_damaged",
        event_at: new Date().toISOString(),
        operator_id: currentUserId || null,
        meta: {
          equipment_id,
          damage_type,
          damage_description: damage_description || null,
          damage_photos_count: damage_photos.length,
          estimated_fee: estimated_fee || null,
          final_damage_fee: finalDamageFee,
          rental_record_id: recordId,
        },
      })

    if (eventError) {
      console.error("[设备损坏上报API] 记录事件失败:", eventError)
      // 事件记录失败不影响主流程
    } else {
      console.log(`[设备损坏上报API] 📝 租赁事件已记录：equipment_damaged，订单ID: ${rental_order_id}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        rental_record_id: recordId,
        damage_fee: finalDamageFee,
        damage_type,
      },
      message: "设备损坏上报成功",
    })
  } catch (err: any) {
    console.error("[设备损坏上报API] 错误:", err)
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
