/**
 * 燃料统计数据 API（Read-Only）
 * 
 * GET /api/facts/fuel/:device_id/stats
 * 
 * 返回结构：
 * {
 *   "total_refilled": number,      // 累计加注量（kg）
 *   "daily_consumption": number,   // 日均消耗（kg/天）
 *   "usage_efficiency": number,    // 使用效率（%）
 * }
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ device_id: string }> }
) {
  try {
    const { device_id } = await params

    if (!supabase) {
      return NextResponse.json({
        success: true,
        total_refilled: 0,
        daily_consumption: 0,
        usage_efficiency: 0,
      })
    }

    if (!device_id) {
      return NextResponse.json({
        success: true,
        total_refilled: 0,
        daily_consumption: 0,
        usage_efficiency: 0,
      })
    }

    // 1. 先通过 device_id 查询 devices 表获取 restaurant_id
    const { data: deviceData, error: deviceError } = await supabase
      .from("devices")
      .select("restaurant_id")
      .eq("device_id", device_id)
      .maybeSingle()

    if (deviceError || !deviceData) {
      console.warn("[燃料统计API] 未找到设备，返回默认值")
      return NextResponse.json({
        success: true,
        total_refilled: 0,
        daily_consumption: 0,
        usage_efficiency: 0,
      })
    }

    const restaurant_id = deviceData.restaurant_id

    // 2. 查询累计加注量（从 delivery_orders 表查询该餐厅的燃料订单）
    // 注意：需要根据订单类型和状态判断是否为加注订单
    // 也可以从 restaurants.total_refilled 字段直接获取（如果已维护）
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("total_refilled")
      .eq("id", restaurant_id)
      .maybeSingle()

    let total_refilled = 0
    if (restaurantData && restaurantData.total_refilled !== null && restaurantData.total_refilled !== undefined) {
      // 优先使用 restaurants.total_refilled（更准确）
      total_refilled = Number(restaurantData.total_refilled) || 0
    } else {
      // 降级：从 delivery_orders 表查询累计加注量
      const { data: refillOrdersData, error: refillOrdersError } = await supabase
        .from("delivery_orders")
        .select("total_amount, quantity, created_at")
        .eq("restaurant_id", restaurant_id)
        .eq("status", "completed")
        .ilike("service_type", "%燃料%")

      if (refillOrdersData) {
        // 累加所有加注订单的数量（优先使用 quantity，否则使用 total_amount / 单价估算）
        total_refilled = refillOrdersData.reduce((sum, order) => {
          if (order.quantity) {
            return sum + (Number(order.quantity) || 0)
          }
          // 如果没有 quantity，使用 total_amount / 11.5（假设单价）估算
          const amount = Number(order.total_amount) || 0
          return sum + (amount > 0 ? Math.round(amount / 11.5) : 0)
        }, 0)
      }
      if (refillOrdersError) {
        console.error("[燃料统计API] 查询累计加注量失败:", refillOrdersError)
      }
    }
    if (restaurantError && restaurantError.code !== "PGRST116") {
      console.error("[燃料统计API] 查询餐厅数据失败:", restaurantError)
    }

    // 3. 查询日均消耗（从 fuel_level 表计算最近30天的消耗趋势）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: fuelHistoryData, error: fuelHistoryError } = await supabase
      .from("fuel_level")
      .select("percentage, created_at")
      .eq("device_id", device_id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true })

    let daily_consumption = 0
    if (fuelHistoryData && fuelHistoryData.length > 1) {
      // 计算平均日消耗：假设满罐为100%，转换为kg（假设5kg/100%）
      const firstLevel = fuelHistoryData[0].percentage || 0
      const lastLevel = fuelHistoryData[fuelHistoryData.length - 1].percentage || 0
      const totalConsumption = (firstLevel - lastLevel) * 5 // 转换为kg
      const daysDiff = Math.max(1, Math.floor(
        (new Date(fuelHistoryData[fuelHistoryData.length - 1].created_at).getTime() - 
         new Date(fuelHistoryData[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
      ))
      daily_consumption = totalConsumption > 0 ? totalConsumption / daysDiff : 0
    }
    if (fuelHistoryError) {
      console.error("[燃料统计API] 查询燃料历史失败:", fuelHistoryError)
    }

    // 4. 计算使用效率（基于燃料利用率）
    // 效率 = (累计加注 - 浪费) / 累计加注 * 100
    // 简化计算：使用效率 = 累计加注 > 0 ? (累计加注 - 未使用量) / 累计加注 * 100 : 0
    let usage_efficiency = 0
    if (total_refilled > 0 && fuelHistoryData && fuelHistoryData.length > 0) {
      // 假设当前剩余量表示未使用量（简化计算）
      const currentLevel = fuelHistoryData[fuelHistoryData.length - 1].percentage || 0
      const unusedAmount = (currentLevel / 100) * 5 // 当前剩余量（kg）
      const usedAmount = total_refilled - unusedAmount
      usage_efficiency = Math.max(0, Math.min(100, (usedAmount / total_refilled) * 100))
    }

    return NextResponse.json({
      success: true,
      total_refilled: total_refilled,
      daily_consumption: daily_consumption,
      usage_efficiency: usage_efficiency,
    })
  } catch (error) {
    console.error("[燃料统计API] 处理请求时出错:", error)
    return NextResponse.json({
      success: true,
      total_refilled: 0,
      daily_consumption: 0,
      usage_efficiency: 0,
    })
  }
}
