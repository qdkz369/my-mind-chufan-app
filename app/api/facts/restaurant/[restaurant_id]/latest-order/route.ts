/**
 * Facts API - 餐厅最近一次配送订单 ID（Read-Only）
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
 * GET /api/facts/restaurant/:restaurant_id/latest-order
 * 
 * 核心原则：
 * - 只 SELECT（只读）
 * - 不写入
 * - 不推断
 * - 不修改 status
 * 
 * 返回结构：
 * {
 *   "order_id": string | null
 * }
 * 
 * 用途：获取最近一次完成的订单 ID，用于后续调用订单事实 API
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyFactAccess } from "@/lib/auth/facts-auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurant_id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
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

    // 查询最近一次完成的订单 ID
    const { data: latestOrderData, error: latestOrderError } = await supabase
      .from("delivery_orders")
      .select("id")
      .eq("restaurant_id", restaurant_id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestOrderError) {
      console.error("[餐厅最近订单API] 查询失败:", latestOrderError)
      // 查询失败时返回 null，不阻断流程
      return NextResponse.json({
        success: true,
        order_id: null,
      })
    }

    return NextResponse.json({
      success: true,
      order_id: latestOrderData?.id || null,
    })
  } catch (error) {
    console.error("[餐厅最近订单API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
