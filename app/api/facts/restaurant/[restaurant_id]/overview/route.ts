/**
 * Facts API - 餐厅事实总览（Read-Only）
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
 * 
 * GET /api/facts/restaurant/:restaurant_id/overview
 * 
 * 核心原则：
 * - 只 SELECT（只读）
 * - 不写入
 * - 不推断
 * - 不修改 status
 * 
 * 返回结构：
 * {
 *   "active_orders": number,
 *   "completed_orders": number,
 *   "active_assets": number,
 *   "last_delivery_at": string | null
 * }
 * 
 * 注意：
 * - 这是事实汇总，不是 KPI
 * - active_orders: 订单状态为 "accepted" 或 "delivering" 的数量（事实）
 * - completed_orders: 订单状态为 "completed" 的数量（事实）
 * - active_assets: 资产状态为 "active" 或 "持有" 的数量（事实）
 * - last_delivery_at: 最后一次配送完成时间（事实，从 completed 订单的 updated_at 获取）
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
        active_orders: 0,
        completed_orders: 0,
        active_assets: 0,
        last_delivery_at: null,
      })
    }

    const { restaurant_id } = await params

    if (!restaurant_id) {
      return NextResponse.json(
        { error: "缺少必要参数: restaurant_id" },
        { status: 400 }
      )
    }

    // 权限验证：验证用户是否有权限访问指定的 restaurant_id
    const accessCheck = await verifyFactAccess(request, restaurant_id)
    if (accessCheck) {
      return accessCheck
    }

    // 1. 查询活跃订单数量（订单状态为 "accepted" 或 "delivering"）
    // 注意：这是事实汇总，只统计实际存在的订单状态
    // 使用 SELECT 查询所有符合条件的订单，然后在代码中统计（符合"不推断"原则）
    const { data: activeOrdersData, error: activeOrdersError } = await supabase
      .from("delivery_orders")
      .select("id")
      .eq("restaurant_id", restaurant_id)
      .in("status", ["accepted", "delivering"])

    if (activeOrdersError) {
      console.error("[餐厅事实总览API] 查询活跃订单失败:", activeOrdersError)
      // 查询失败时返回 0，不阻断流程
    }

    const active_orders = activeOrdersData ? activeOrdersData.length : 0

    // 2. 查询已完成订单数量（订单状态为 "completed"）
    const { data: completedOrdersData, error: completedOrdersError } = await supabase
      .from("delivery_orders")
      .select("id")
      .eq("restaurant_id", restaurant_id)
      .eq("status", "completed")

    if (completedOrdersError) {
      console.error("[餐厅事实总览API] 查询已完成订单失败:", completedOrdersError)
      // 查询失败时返回 0，不阻断流程
    }

    const completed_orders = completedOrdersData ? completedOrdersData.length : 0

    // 3. 查询活跃资产数量（资产状态为 "active" 或 "持有"）
    // 注意：通过 devices 表查询（devices.restaurant_id）
    // 注意：按照"不推断"原则，只统计实际存在的设备状态
    const { data: activeAssetsData, error: activeAssetsError } = await supabase
      .from("devices")
      .select("device_id")
      .eq("restaurant_id", restaurant_id)
      .in("status", ["active", "持有"])

    if (activeAssetsError) {
      console.error("[餐厅事实总览API] 查询活跃资产失败:", activeAssetsError)
      // 查询失败时返回 0，不阻断流程
    }

    const active_assets = activeAssetsData ? activeAssetsData.length : 0

    // 4. 查询最后一次配送完成时间（从 completed 订单的 updated_at 获取）
    // 注意：这是事实，不是推断
    const { data: lastDeliveryData, error: lastDeliveryError } = await supabase
      .from("delivery_orders")
      .select("updated_at")
      .eq("restaurant_id", restaurant_id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastDeliveryError) {
      console.error("[餐厅事实总览API] 查询最后一次配送时间失败:", lastDeliveryError)
      // 查询失败时返回 null
    }

    const last_delivery_at = lastDeliveryData?.updated_at || null

    return NextResponse.json({
      success: true,
      active_orders: active_orders,
      completed_orders: completed_orders,
      active_assets: active_assets,
      last_delivery_at: last_delivery_at,
    })
  } catch (error) {
    console.error("[餐厅事实总览API] 处理请求时出错:", error)
    // 即使出错，也返回合法的 JSON 对象，避免 500 错误
    return NextResponse.json({
      success: true,
      active_orders: 0,
      completed_orders: 0,
      active_assets: 0,
      last_delivery_at: null,
    })
  }
}
