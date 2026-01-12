/**
 * Facts API - 燃料统计数据（Read-Only）
 * 
 * ========================================
 * Facts API 使用约束
 * ========================================
 * 
 * 1. 只读 Facts API
 *    - 本 API 为只读事实表面（Read-Only Truth Surface）
 *    - 不执行任何业务逻辑，不修改任何数据
 *    - 所有操作均为只读查询（SELECT），不执行 INSERT/UPDATE/DELETE
 * 
 * 2. 主要消费方
 *    - User UI: 用户界面（展示事实视图，不进行业务判断）
 *    - Admin: 管理端（审计、治理、运营分析）
 *    - AI: AI 系统（解释引擎、分析系统、智能助手）
 * 
 * 3. UI 使用约束（⚠️ 重要）
 *    - UI 禁止基于 Facts 进行业务判断或流程控制
 *    - UI 禁止根据 fact_warnings 或 fact_health 自动触发业务动作
 *    - UI 禁止将 Facts 当作业务 API 使用（如：根据 fact_health.score 决定是否显示按钮）
 *    - UI 只能将 Facts 用于"展示事实视图"，不能用于"业务决策"
 * 
 * 4. 明确声明
 *    - 不写数据库：所有操作均为只读查询（SELECT），不执行 INSERT/UPDATE/DELETE
 *    - 不触发业务动作：不修改订单状态、不发送通知、不调用外部 API
 *    - 不承担决策责任：仅提供事实信息，不判断"应该做什么"或"不应该做什么"
 * 
 * 5. ⚠️ Financial View 禁止事项（重要）
 *    - 本 API 不返回任何金融字段（amount, rate, installment, repayment, interest）
 *    - 如需展示金融信息，请使用独立的 Financial View API
 *    - 严禁写入 facts 表或结构
 *    - Financial View – Derived / Non-Fact（金融视图是派生/非事实数据）
 *    - 本 API 只返回数量（kg），不返回金额
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
    // ⚠️ Facts API 禁止：不查询任何金融字段（amount, rate, installment, repayment, interest）
    // ⚠️ Facts API 禁止：不计算任何金额或费用
    // 注意：只查询 quantity（数量，kg），不查询 total_amount（金额）
    // 也可以从 restaurants.total_refilled 字段直接获取（如果已维护）
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("total_refilled")
      .eq("id", restaurant_id)
      .maybeSingle()

    let total_refilled = 0
    if (restaurantData && restaurantData.total_refilled !== null && restaurantData.total_refilled !== undefined) {
      // 优先使用 restaurants.total_refilled（更准确，这是事实字段，不是金融字段）
      total_refilled = Number(restaurantData.total_refilled) || 0
    } else {
      // 降级：从 delivery_orders 表查询累计加注量
      // ⚠️ 只查询 quantity（数量），不查询 total_amount（金额）
      const { data: refillOrdersData, error: refillOrdersError } = await supabase
        .from("delivery_orders")
        .select("quantity, created_at")
        .eq("restaurant_id", restaurant_id)
        .eq("status", "completed")
        .ilike("service_type", "%燃料%")

      if (refillOrdersData) {
        // 累加所有加注订单的数量（只使用 quantity，不涉及金额）
        // ⚠️ 如果 quantity 不存在，返回 0（不通过 total_amount 估算）
        total_refilled = refillOrdersData.reduce((sum, order) => {
          return sum + (Number(order.quantity) || 0)
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
