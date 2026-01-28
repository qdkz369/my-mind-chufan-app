/**
 * Facts API - 餐厅关联资产列表（Read-Only）
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
 * GET /api/facts/restaurant/:restaurant_id/assets
 * 
 * 核心原则：
 * - 只 SELECT（只读）
 * - 不写入
 * - 不推断
 * - 不修改 status
 * 
 * 返回结构：
 * {
 *   "assets": AssetFact[]
 * }
 * 
 * 逻辑说明：
 * - 从 devices 表查询该餐厅的设备（资产）
 * - 为每个设备查询最后一次操作（从 trace_logs 中获取）
 * - 返回 AssetFact[] 列表
 */

import { NextResponse, NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { AssetFact } from "@/lib/facts/types"
import { AssetFactContract } from "@/lib/facts/contracts/order.fact"
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
        assets: [],
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

    // 1. 查询该餐厅的设备（资产）
    const { data: devicesData, error: devicesError } = await supabase
      .from("devices")
      .select("device_id, status, created_at, updated_at")
      .eq("restaurant_id", restaurant_id)

    if (devicesError) {
      console.error("[餐厅资产列表API] 查询设备失败:", devicesError)
      // 查询失败时返回空数组，不阻断流程
      return NextResponse.json({
        success: true,
        assets: [],
      })
    }

    if (!devicesData || devicesData.length === 0) {
      return NextResponse.json({
        success: true,
        assets: [],
      })
    }

    // 2. 为每个设备查询最后一次操作（从 trace_logs 中获取）
    // 注意：supabase 已经在函数开头检查，这里可以安全使用
    if (!supabase) {
      return NextResponse.json({
        success: true,
        assets: [],
      })
    }

    // 将 supabase 赋值给局部常量，确保 TypeScript 类型收窄
    const supabaseClient = supabase

    const assetsWithTraces = await Promise.all(
      devicesData.map(async (device) => {
        // 查询该设备的最后一次操作（从 trace_logs 中）
        const { data: lastTrace, error: lastTraceError } = await supabaseClient
          .from("trace_logs")
          .select("action_type, created_at")
          .eq("asset_id", device.device_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastTraceError || !lastTrace) {
          // 如果没有溯源记录，按照"不推断"原则
          const fallbackTime = device.updated_at || device.created_at
          
          if (!fallbackTime) {
            console.warn(`[餐厅资产列表API] 设备 ${device.device_id} 没有 updated_at 和 created_at，无法确定 last_action_at`)
          }
          
          // 映射到 AssetFactContract 类型（事实契约）
          // 注意：如果 trace_logs 无记录，last_action_at 必须为 null，不得使用 updated_at 或 created_at 伪装
          return {
            asset_id: device.device_id,
            status: device.status || "unknown",
            last_action: "", // 没有溯源记录时，last_action 为空字符串（事实不存在）
            last_action_at: null, // 如果 trace_logs 无记录，必须为 null，不得使用 updated_at 或 created_at
          } as AssetFactContract
        }

        // 映射到 AssetFactContract 类型（事实契约）
        return {
          asset_id: device.device_id,
          status: device.status || "unknown",
          last_action: lastTrace.action_type || "", // 确保是字符串类型
          last_action_at: lastTrace.created_at,
        } as AssetFactContract
      })
    )

    return NextResponse.json({
      success: true,
      assets: assetsWithTraces,
    })
  } catch (error) {
    console.error("[餐厅资产列表API] 处理请求时出错:", error)
    // 即使出错，也返回合法的 JSON 对象，避免 500 错误
    return NextResponse.json({
      success: true,
      assets: [],
    })
  }
}
