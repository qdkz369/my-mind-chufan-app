/**
 * 订单事实聚合 API（Read-Only）
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

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { OrderFact, AssetFact, TraceFact } from "@/lib/facts/types"
import { OrderFactContract, TraceFactContract, AssetFactContract, validateOrderFactContract } from "@/lib/facts/contracts/order.fact"
import { verifyFactAccess, verifyOrderOwnership } from "@/lib/auth/facts-auth"
import { OrderFactGuard } from "@/lib/facts/governance/order.fact.guard"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
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

    // 映射到 OrderFactContract 类型（事实契约）
    // 注意：按照"不推断"原则，只返回实际存在的字段
    // 使用 null 表示事实不存在，不使用 undefined
    const orderFact: OrderFactContract = {
      order_id: orderData.id,
      restaurant_id: orderData.restaurant_id,
      status: orderData.status,
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

    // 6. 通过 trace_logs 反查关联的资产（gas_cylinders 表）
    // 从 traces 中提取所有唯一的 asset_id
    const assetIds = Array.from(new Set(traces.map((trace) => trace.asset_id)))

    let assets: AssetFactContract[] = []

    if (assetIds.length > 0) {
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
            const { data: lastTrace, error: lastTraceError } = await supabase
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
      return NextResponse.json(
        {
          success: false,
          error: "订单事实不符合契约",
          details: validation.errors,
        },
        { status: 500 }
      )
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
    })

    return NextResponse.json({
      success: true,
      order: orderFact,
      assets: assets,
      traces: traces,
      fact_warnings: governanceResult.fact_warnings.length > 0 
        ? governanceResult.fact_warnings 
        : undefined, // 如果没有警告，则不返回该字段
    })
  } catch (error) {
    console.error("[订单事实API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
