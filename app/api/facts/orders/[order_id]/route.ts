/**
 * Facts API - 订单事实聚合（Read-Only）
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
 * GET /api/facts/orders/:order_id
 * 
 * 核心原则：
 * - 只 SELECT（只读）
 * - 不写入
 * - 不推断
 * - 不修改 status
 * 
 * 返回结构：
 * {
 *   "order": OrderFact,
 *   "assets": AssetFact[],
 *   "traces": TraceFact[]
 * }
 * 
 * 逻辑说明：
 * - order → delivery_orders 表（直接查询）
 * - traces → trace_logs 表（按 order_id 查询，按 created_at ASC 排序）
 * - assets → gas_cylinders 表（通过 trace_logs 反查关联的 asset_id）
 */

import { NextResponse, NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { OrderFact, AssetFact, TraceFact } from "@/lib/facts/types"
import { OrderFactContract, TraceFactContract, AssetFactContract, validateOrderFactContract } from "@/lib/facts/contracts/order.fact"
import { verifyFactAccess, verifyOrderOwnership } from "@/lib/auth/facts-auth"
import { OrderFactGuard, calculateFactHealth } from "@/lib/facts/governance/order.fact.guard"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    if (!supabase) {
      // 即使数据库连接失败，也返回合法的 JSON 对象，避免 500 错误
      return NextResponse.json({
        success: false,
        error: "数据库连接失败",
        order: null,
        assets: [],
        traces: [],
      })
    }

    const { order_id } = await params

    if (!order_id) {
      return NextResponse.json(
        { error: "缺少必要参数: order_id" },
        { status: 400 }
      )
    }

    // 1. 查询订单事实（delivery_orders 表）
    const { data: orderData, error: orderError } = await supabase
      .from("delivery_orders")
      .select("id, restaurant_id, status, created_at, updated_at, worker_id")
      .eq("id", order_id)
      .single()

    if (orderError) {
      console.error("[订单事实API] 查询订单失败:", orderError)
      return NextResponse.json(
        {
          error: "订单不存在",
          details: orderError.message,
        },
        { status: 404 }
      )
    }

    if (!orderData) {
      return NextResponse.json(
        { error: "订单不存在" },
        { status: 404 }
      )
    }

    // 2. 权限验证：验证用户是否有权限访问该订单的 restaurant_id
    const accessCheck = await verifyFactAccess(request, orderData.restaurant_id)
    if (accessCheck) {
      return accessCheck
    }

    // 3. 额外验证：验证订单是否属于指定的 restaurant_id（双重验证）
    const ownershipCheck = await verifyOrderOwnership(order_id, orderData.restaurant_id)
    if (ownershipCheck) {
      return ownershipCheck
    }

    // 4. 查询订单状态变化记录（从 audit_logs 表）
    // 注意：按照"不推断"原则，只返回实际存在的记录
    // 注意：必须查询所有与订单相关的 audit_logs 记录，确保所有状态变化都被展示
    // 核心原则：只要事实发生过，就一定能被展示
    let acceptedAt: string | undefined
    let completedAt: string | undefined

    // 查询所有与订单相关的 audit_logs 记录（不限制 action 类型）
    // 这样可以确保所有订单状态变化都被捕获
    const { data: auditLogsData, error: auditLogsError } = await supabase
      .from("audit_logs")
      .select("action, created_at, actor_id")
      .eq("target_type", "delivery_order")
      .eq("target_id", order_id)
      .order("created_at", { ascending: true })

    // 调试日志：验证 audit_logs 中是否真实存在订单事实数据
    console.log("ORDER_ID", order_id)
    console.log("AUDIT_LOGS_RAW", JSON.stringify(auditLogsData, null, 2))
    console.log("AUDIT_LOGS_ERROR", auditLogsError)

    // 用于判断字段为 null 的原因
    let acceptedAtReason: string | undefined
    let completedAtReason: string | undefined
    const allActionValues: string[] = []

    if (!auditLogsError && auditLogsData) {
      // 从 audit_logs 中提取 accepted_at 和 completed_at（事实）
      // 注意：遍历所有 audit_logs 记录，确保所有状态变化都被捕获
      auditLogsData.forEach((log) => {
        // 收集所有 action 值用于调试
        if (log.action) {
          allActionValues.push(log.action)
        }
        
        // 遍历所有订单状态变化动作（事实）
        // 支持多种 action 格式，确保兼容性
        const actionUpper = log.action?.toUpperCase() || ""
        if (actionUpper === "ORDER_ACCEPTED" || actionUpper === "ORDER_ACCEPT") {
          acceptedAt = log.created_at
        } else if (actionUpper === "ORDER_COMPLETED" || actionUpper === "ORDER_COMPLETE") {
          completedAt = log.created_at
        }
        // 注意：所有状态变化（如 ORDER_DISPATCHED, ORDER_REJECTED 等）都已从 audit_logs 查询
        // OrderFact 类型目前包含 accepted_at 和 completed_at 字段
        // 其他状态变化记录存在于 audit_logs 中，可以根据需要扩展 OrderFact 类型
      })
      
      // 判断为什么字段为 null
      if (!acceptedAt) {
        const hasAcceptAction = allActionValues.some(action => {
          const upper = action?.toUpperCase() || ""
          return upper === "ORDER_ACCEPTED" || upper === "ORDER_ACCEPT"
        })
        acceptedAtReason = hasAcceptAction 
          ? "action 名称不匹配（期望 ORDER_ACCEPTED 或 ORDER_ACCEPT）" 
          : "audit_logs 无该 action（ORDER_ACCEPTED / ORDER_ACCEPT）"
      }
      
      if (!completedAt) {
        const hasCompleteAction = allActionValues.some(action => {
          const upper = action?.toUpperCase() || ""
          return upper === "ORDER_COMPLETED" || upper === "ORDER_COMPLETE"
        })
        completedAtReason = hasCompleteAction 
          ? "action 名称不匹配（期望 ORDER_COMPLETED 或 ORDER_COMPLETE）" 
          : "audit_logs 无该 action（ORDER_COMPLETED / ORDER_COMPLETE）"
      }
    } else if (auditLogsError) {
      console.warn("[订单事实API] 查询 audit_logs 失败:", auditLogsError)
      acceptedAtReason = "audit_logs 查询失败"
      completedAtReason = "audit_logs 查询失败"
      // 查询失败不影响主流程，继续执行
      // 注意：即使 audit_logs 查询失败，仍然返回订单基本信息，符合"不阻断流程"原则
    } else {
      // audit_logs 为空或不存在
      acceptedAtReason = "audit_logs 无记录"
      completedAtReason = "audit_logs 无记录"
    }

    // 调试日志：验证 accepted_at / completed_at 是否被正确计算
    console.log("FACT_TIMES", {
      accepted_at: acceptedAt || null,
      completed_at: completedAt || null,
      accepted_at_reason: acceptedAtReason || "已找到",
      completed_at_reason: completedAtReason || "已找到",
      all_actions: allActionValues,
    })

    // 从 audit_logs 推断 previous_state（前一个状态）
    // 根据状态变化历史推断，如果无法推断则为 null（初始状态）
    let previousState: string | null = null
    if (auditLogsData && auditLogsData.length > 0) {
      // 查找状态变化记录，推断前一个状态
      // 这里简化处理：如果存在状态变化记录，尝试推断前一个状态
      // 实际实现可能需要更复杂的逻辑来从 action 中提取状态信息
      // 暂时设置为 null，表示初始状态或无前一个状态
      previousState = null
    }

    // 根据当前状态计算 next_expected_state（下一个预期状态）
    // 根据业务规则定义预期状态转换
    let nextExpectedState: string | null = null
    const currentStatus = orderData.status
    const statusFlow: Record<string, string | null> = {
      pending: "accepted",
      accepted: "delivering",
      delivering: "completed",
      completed: null, // 终态
      exception: null, // 终态
      rejected: null, // 终态
      cancelled: null, // 终态
    }
    nextExpectedState = statusFlow[currentStatus] || null

    // 映射到 OrderFactContract 类型（事实契约）
    // 注意：按照"不推断"原则，只返回实际存在的字段
    // 使用 null 表示事实不存在，不使用 undefined
    const orderFact: OrderFactContract = {
      order_id: orderData.id,
      restaurant_id: orderData.restaurant_id,
      status: orderData.status,
      previous_state: previousState,
      next_expected_state: nextExpectedState,
      created_at: orderData.created_at,
      worker_id: orderData.worker_id || null, // 使用 null 表示事实不存在
      accepted_at: acceptedAt || null, // 从 audit_logs 获取，如果不存在则为 null（事实不存在）
      completed_at: completedAt || null, // 从 audit_logs 获取，如果不存在则为 null（事实不存在）
    }

    // 5. 查询订单关联的溯源记录（trace_logs 表，按 created_at ASC 排序）
    const { data: tracesData, error: tracesError } = await supabase
      .from("trace_logs")
      .select("id, asset_id, operator_id, action_type, order_id, created_at")
      .eq("order_id", order_id)
      .order("created_at", { ascending: true }) // 按时间正序排列

    if (tracesError) {
      console.error("[订单事实API] 查询溯源记录失败:", tracesError)
      // 查询失败时返回空数组，不阻断流程
    }

    const tracesList = tracesData || []

    // 映射到 TraceFactContract 类型（事实契约）
    // 使用 null 表示事实不存在，不使用 undefined
    const traces: TraceFactContract[] = tracesList.map((trace) => ({
      id: trace.id,
      asset_id: trace.asset_id,
      action_type: trace.action_type as TraceFactContract['action_type'],
      operator_id: trace.operator_id,
      order_id: trace.order_id || null, // 使用 null 表示事实不存在
      created_at: trace.created_at,
    }))

    // 6. 建立 asset_id 到 device_id 的映射（best-effort，用于填充 FactWarning.device_id）
    // 从 traces 中提取所有唯一的 asset_id
    const assetIds = Array.from(new Set(traces.map((trace) => trace.asset_id)))
    
    // 查询 devices 表，建立 asset_id 到 device_id 的映射
    // 规则：如果 trace.asset_id 能在 devices 表中找到（devices.device_id = trace.asset_id），则填充 device_id
    const assetIdToDeviceIdMap: Record<string, string | null> = {}
    
    if (assetIds.length > 0) {
      // 查询 devices 表，检查哪些 asset_id 对应 device_id
      // 注意：这是只读查询，不新增数据库写操作
      const { data: devicesData, error: devicesError } = await supabase
        .from("devices")
        .select("device_id")
        .in("device_id", assetIds)
      
      if (devicesError) {
        console.warn("[订单事实API] 查询 devices 表失败（不影响主流程）:", devicesError)
        // 查询失败时，所有 asset_id 的 device_id 都设置为 null（best-effort）
      } else if (devicesData) {
        // 建立映射：如果 asset_id 在 devices 表中存在，则 device_id = asset_id
        devicesData.forEach((device) => {
          assetIdToDeviceIdMap[device.device_id] = device.device_id
        })
      }
      
      // 对于不在 devices 表中的 asset_id，映射为 null
      assetIds.forEach((assetId) => {
        if (!(assetId in assetIdToDeviceIdMap)) {
          assetIdToDeviceIdMap[assetId] = null
        }
      })
    }

    // 7. 通过 trace_logs 反查关联的资产（gas_cylinders 表）
    let assets: AssetFactContract[] = []

    if (assetIds.length > 0 && supabase) {
      // 查询这些资产的当前状态（只读，不推断）
      const { data: assetsData, error: assetsError } = await supabase
        .from("gas_cylinders")
        .select("id, status, created_at, updated_at")
        .in("id", assetIds)

      if (assetsError) {
        console.error("[订单事实API] 查询资产状态失败:", assetsError)
        // 查询失败时返回空数组，不阻断流程
      } else if (assetsData) {
        // 为每个资产查询最后一次操作（从 trace_logs 中获取）
        const assetsWithTraces = await Promise.all(
          assetsData.map(async (asset) => {
            // 查询该资产的最后一次操作（从 trace_logs 中）
            // 注意：supabase 已经在 if 条件中检查，这里可以安全使用
            const { data: lastTrace, error: lastTraceError } = await supabase!
              .from("trace_logs")
              .select("action_type, created_at")
              .eq("asset_id", asset.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()

            if (lastTraceError || !lastTrace) {
              // 如果没有溯源记录，按照"不推断"原则
              // 注意：这是事实，表示"没有溯源记录"的事实状态
              // last_action 为空字符串（事实：没有溯源记录）
              // last_action_at 使用资产的 updated_at 或 created_at（如果存在）
              // 按照"不推断"原则：如果资产没有溯源记录，且没有 updated_at 或 created_at，则不能推断时间
              // 但 AssetFact 要求 last_action_at 必须为 string，所以使用资产的 created_at（如果存在）
              const fallbackTime = asset.updated_at || asset.created_at
              
              if (!fallbackTime) {
                // 如果没有 updated_at 和 created_at，记录事实：无法确定 last_action_at
                console.warn(`[订单事实API] 资产 ${asset.id} 没有 updated_at 和 created_at，无法确定 last_action_at`)
              }
              
              // 映射到 AssetFactContract 类型（事实契约）
              return {
                asset_id: asset.id,
                status: asset.status,
                last_action: "", // 没有溯源记录时，last_action 为空字符串（事实不存在）
                last_action_at: fallbackTime || "", // 使用 updated_at 或 created_at（事实），如果都没有则使用空字符串（不推断）
              } as AssetFactContract
            }

            // 映射到 AssetFactContract 类型（事实契约）
            return {
              asset_id: asset.id,
              status: asset.status,
              last_action: lastTrace.action_type || "", // 确保是字符串类型
              last_action_at: lastTrace.created_at,
            } as AssetFactContract
          })
        )

        assets = assetsWithTraces
      }
    }

    // 调试日志：验证 API 最终返回的 order 对象是否完整
    console.log("ORDER_FACT_RETURN", JSON.stringify(orderFact, null, 2))
    console.log("ORDER_FACT_FIELD_SOURCES", {
      "order_id": "来自 delivery_orders.id",
      "restaurant_id": "来自 delivery_orders.restaurant_id",
      "status": "来自 delivery_orders.status",
      "created_at": "来自 delivery_orders.created_at",
      "worker_id": "来自 delivery_orders.worker_id",
      "accepted_at": "来自 audit_logs (ORDER_ACCEPTED/ORDER_ACCEPT 的 created_at)",
      "completed_at": "来自 audit_logs (ORDER_COMPLETED/ORDER_COMPLETE 的 created_at)",
    })
    console.log("ORDER_FACT_FIELDS_CHECK", {
      "created_at_exists": !!orderFact.created_at,
      "accepted_at_exists": orderFact.accepted_at !== null && orderFact.accepted_at !== undefined,
      "completed_at_exists": orderFact.completed_at !== null && orderFact.completed_at !== undefined,
      "status_exists": !!orderFact.status,
      "created_at_value": orderFact.created_at,
      "accepted_at_value": orderFact.accepted_at || null,
      "completed_at_value": orderFact.completed_at || null,
      "status_value": orderFact.status,
    })

    // 强制验证：所有 /api/facts/ 返回的数据必须在返回前通过 validate
    const validation = validateOrderFactContract(orderFact)
    if (!validation.valid) {
      console.error("[订单事实API] 订单事实不符合契约:", validation.errors)
      // 即使验证失败，也返回合法的 JSON 对象，避免 500 错误
      // 前端可以根据 success: false 判断数据不可用
      return NextResponse.json({
        success: false,
        error: "订单事实不符合契约",
        details: validation.errors,
        order: null,
        assets: [],
        traces: [],
      })
    }

    // 事实治理层：在返回前检查事实契约违反情况
    // 注意：治理层不会阻断 API 响应，只会记录警告
    const governanceResult = OrderFactGuard({
      order: orderFact,
      traces: traces,
      audit_logs: (auditLogsData || []).map((log) => ({
        action: log.action || "",
        created_at: log.created_at || "",
      })),
      assetIdToDeviceIdMap, // 传递 asset_id 到 device_id 的映射（best-effort）
    })

    // 计算事实健康度汇总（纯只读聚合函数）
    const healthSummary = calculateFactHealth(governanceResult.fact_warnings_structured)

    // 构建响应对象
    const response: any = {
      success: true,
      order: orderFact,
      assets: assets,
      traces: traces,
    }

    // 如果有警告，添加警告字段
    if (governanceResult.fact_warnings.length > 0) {
      // 向后兼容：保留原有的 fact_warnings 字段
      response.fact_warnings = governanceResult.fact_warnings
      // 新格式：人类可读格式
      response.fact_warnings_human = governanceResult.fact_warnings
      // 新格式：结构化格式（用于管理端治理列表、自动修复任务、事实健康度可视化）
      response.fact_warnings_structured = governanceResult.fact_warnings_structured
    }

    // 添加事实健康度汇总（无论是否有警告都返回）
    response.fact_health = {
      score: healthSummary.health_score,
      summary: {
        high: healthSummary.by_level.high,
        medium: healthSummary.by_level.medium,
        low: healthSummary.by_level.low,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[订单事实API] 处理请求时出错:", error)
    // 即使出错，也返回合法的 JSON 对象，避免 500 错误
    // 前端可以根据 success: false 判断数据不可用
    return NextResponse.json({
      success: false,
      error: "服务器内部错误",
      details: error instanceof Error ? error.message : "未知错误",
      order: null,
      assets: [],
      traces: [],
    })
  }
}
