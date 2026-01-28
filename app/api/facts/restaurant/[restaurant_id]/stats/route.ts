/**
 * Facts API - 餐厅统计数据（Read-Only）
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
 * GET /api/facts/restaurant/:restaurant_id/stats
 * 
 * ⚠️ Financial View 禁止事项：
 * - 本 API 不返回任何金融字段（amount, rate, installment, repayment, interest）
 * - 如需展示金融信息，请使用独立的 Financial View API
 * - 严禁写入 facts 表或结构
 * 
 * 返回结构：
 * {
 *   "total_orders": number,        // 累计订单数（事实）
 *   "points_balance": number,       // 积分余额（事实，非金融字段）
 * }
 * 
 * ⚠️ 已移除字段：
 * - "total_spent": number          // Financial View – Derived / Non-Fact（已移除）
 */

import { NextResponse, NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyFactAccess } from "@/lib/auth/facts-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurant_id: string }> }
) {
  try {
    if (!supabase) {
      // 即使数据库连接失败，也返回合法的 JSON 对象，避免 500 错误
      return NextResponse.json({
        success: true,
        total_orders: 0,
        points_balance: 0,
      })
    }

    const { restaurant_id } = await params

    if (!restaurant_id) {
      // 即使缺少参数，也返回合法的 JSON 对象，避免 400 错误
      return NextResponse.json({
        success: true,
        total_orders: 0,
        points_balance: 0,
      })
    }

    // 权限验证
    const accessCheck = await verifyFactAccess(request, restaurant_id)
    if (accessCheck) {
      return accessCheck
    }

    // 1. 查询累计订单数（delivery_orders 表中所有订单）
    const { data: ordersData, error: ordersError } = await supabase
      .from("delivery_orders")
      .select("id")
      .eq("restaurant_id", restaurant_id)

    const total_orders = ordersData ? ordersData.length : 0
    if (ordersError) {
      console.error("[餐厅统计API] 查询订单数失败:", ordersError)
    }

    // 2. ⚠️ Financial View – Derived / Non-Fact
    // 已移除：累计消费金额（total_spent）
    // 原因：Facts API 禁止返回任何金融字段（amount, rate, installment, repayment, interest）
    // 如需展示金融信息，请使用独立的 Financial View API
    // 严禁写入 facts 表或结构

    // 3. 查询积分余额（从 restaurants 表的 points 字段或单独的 points 表）
    // 先尝试从 restaurants 表查询
    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("points")
      .eq("id", restaurant_id)
      .maybeSingle()

    let points_balance = 0
    if (restaurantData && restaurantData.points !== null && restaurantData.points !== undefined) {
      points_balance = Number(restaurantData.points) || 0
    } else if (restaurantError && restaurantError.code !== "PGRST116") {
      console.error("[餐厅统计API] 查询积分余额失败:", restaurantError)
    }

    // 如果没有 points 字段，尝试查询独立的 points 表（如果存在）
    if (points_balance === 0 && restaurantError?.code !== "PGRST116") {
      const { data: pointsData, error: pointsError } = await supabase
        .from("points")
        .select("balance")
        .eq("restaurant_id", restaurant_id)
        .maybeSingle()

      if (pointsData && pointsData.balance !== null && pointsData.balance !== undefined) {
        points_balance = Number(pointsData.balance) || 0
      } else if (pointsError && pointsError.code !== "PGRST116") {
        console.warn("[餐厅统计API] 查询points表失败:", pointsError)
      }
    }

    return NextResponse.json({
      success: true,
      total_orders: total_orders,
      points_balance: points_balance,
    })
  } catch (error) {
    console.error("[餐厅统计API] 处理请求时出错:", error)
    // 即使出错，也返回合法的 JSON 对象，避免 500 错误
    return NextResponse.json({
      success: true,
      total_orders: 0,
      points_balance: 0,
    })
  }
}
