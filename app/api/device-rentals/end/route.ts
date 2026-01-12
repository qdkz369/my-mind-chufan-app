/**
 * 结束设备租赁记录 API
 * 
 * POST /api/device-rentals/end
 * 
 * 功能：结束设备的租赁记录
 * - 设置结束时间
 * - 更新状态为 'ended'
 * 
 * 注意：
 * - 不涉及租金计算
 * - 不涉及金融逻辑
 * - 只更新使用关系状态
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { rental_id, end_at } = body

    // 验证必需字段
    if (!rental_id) {
      return NextResponse.json(
        { error: "缺少必需字段：rental_id" },
        { status: 400 }
      )
    }

    // 使用当前时间作为结束时间（如果未提供）
    const finalEndAt = end_at || new Date().toISOString()

    // 验证租赁记录是否存在且为活跃状态
    const { data: rental, error: rentalError } = await supabase
      .from("device_rentals")
      .select("*")
      .eq("id", rental_id)
      .single()

    if (rentalError || !rental) {
      return NextResponse.json(
        { error: "租赁记录不存在" },
        { status: 404 }
      )
    }

    if (rental.status === "ended") {
      return NextResponse.json(
        { error: "该租赁记录已结束" },
        { status: 400 }
      )
    }

    // 验证结束时间不能早于开始时间
    const startAt = new Date(rental.start_at).getTime()
    const endAtTime = new Date(finalEndAt).getTime()

    if (endAtTime < startAt) {
      return NextResponse.json(
        { error: "结束时间不能早于开始时间" },
        { status: 400 }
      )
    }

    // 更新租赁记录
    const { data: updatedRental, error: updateError } = await supabase
      .from("device_rentals")
      .update({
        end_at: finalEndAt,
        status: "ended",
      })
      .eq("id", rental_id)
      .select("*")
      .single()

    if (updateError) {
      console.error("[设备租赁API] 更新失败:", updateError)
      return NextResponse.json(
        { error: "结束租赁记录失败", details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedRental,
      message: "设备租赁记录已结束",
    })
  } catch (err: any) {
    console.error("[设备租赁API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
