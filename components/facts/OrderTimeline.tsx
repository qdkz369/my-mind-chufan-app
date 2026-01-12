"use client"

/**
 * 订单事实时间线组件
 * 
 * 核心原则：
 * - 不做"看板"，只做"事实呈现"
 * - 不强调颜色判断（红/绿仅表示发生与否）
 * - 不显示"正常 / 异常"
 * - iOS 风格（毛玻璃效果、大圆角、简洁设计）
 * 
 * 数据来源：
 * - trace_logs: 溯源记录（行为、操作人、时间、关联订单）
 * - 订单状态变化: 从 OrderFact 中的状态字段获取
 * 
 * 渲染规则：
 * - 垂直时间线
 * - 每一条必须显示：行为、操作人、时间、关联订单（如有）
 */

import { OrderFactContract, TraceFactContract } from "@/lib/facts/contracts/order.fact"
import { Clock, User, Package, Circle } from "lucide-react"

/**
 * OrderTimeline 组件 Props
 * 
 * 约束：
 * - order 必须使用 OrderFactContract 类型（事实契约）
 * - traces 必须使用 TraceFactContract[] 类型（事实契约）
 * - 组件不得直接依赖数据库字段结构
 */
interface OrderTimelineProps {
  order: OrderFactContract
  traces: TraceFactContract[]
  className?: string
}

// 订单状态显示映射（仅用于显示，不用于判断）
const statusLabelMap: Record<string, string> = {
  pending: "待接单",
  accepted: "已接单",
  delivering: "配送中",
  completed: "已完成",
  exception: "异常",
  rejected: "已拒绝",
  cancelled: "已取消",
}

// 操作类型显示映射（将事实层 code 映射为中文标签）
// 注意：这是 UI 层映射，事实层使用英文 code
const actionTypeLabelMap: Record<string, string> = {
  ASSET_CREATED: "出厂",
  ASSET_FILLED: "充装",
  ASSET_DELIVERED: "配送",
  ASSET_RETURNED: "回收",
  ASSET_INSPECTED: "安检",
}

/**
 * 格式化时间显示
 */
function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "刚刚"
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`

    // 超过7天，显示具体日期
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${month}-${day} ${hours}:${minutes}`
  } catch {
    return timestamp
  }
}

/**
 * 合并时间线节点
 * 将订单状态变化和溯源记录合并成统一的时间线
 */
function mergeTimelineNodes(order: OrderFactContract, traces: TraceFactContract[]) {
  // 调试日志：验证 OrderTimeline 是否因逻辑条件"吃掉事实"
  console.log("TIMELINE_INPUT", { 
    order: {
      order_id: order.order_id,
      status: order.status,
      created_at: order.created_at,
      accepted_at: order.accepted_at,
      completed_at: order.completed_at,
      worker_id: order.worker_id,
    },
    traces: traces.map(t => ({
      id: t.id,
      action_type: t.action_type,
      created_at: t.created_at,
      operator_id: t.operator_id,
    })),
    traces_count: traces.length,
    accepted_at_exists: order.accepted_at !== null && order.accepted_at !== undefined,
    completed_at_exists: order.completed_at !== null && order.completed_at !== undefined,
  })

  const nodes: Array<{
    id: string
    type: "order_status" | "trace"
    label: string
    operator?: string
    timestamp: string
    orderId?: string
    assetId?: string
  }> = []

  // 1. 添加订单创建节点
  const createdNode = {
    id: `order-created-${order.order_id}`,
    type: "order_status" as const,
    label: `订单创建：${statusLabelMap[order.status] || order.status}`,
    timestamp: order.created_at,
    orderId: order.order_id,
  }
  console.log("PUSH_NODE", { type: "订单创建", node: createdNode })
  nodes.push(createdNode)

  // 2. 添加订单状态变化节点（从 audit_logs 获取的事实）
  // 注意：按照"不推断"原则，只显示实际存在的状态变化记录
  // 使用 null 检查，因为 OrderFactContract 使用 null 表示事实不存在
  if (order.accepted_at !== null && order.accepted_at !== undefined) {
    const acceptedNode = {
      id: `order-accepted-${order.order_id}-${order.accepted_at}`,
      type: "order_status" as const,
      label: `订单已接单`,
      operator: order.worker_id || undefined,
      timestamp: order.accepted_at,
      orderId: order.order_id,
    }
    console.log("PUSH_NODE", { type: "订单已接单", node: acceptedNode })
    nodes.push(acceptedNode)
  } else {
    console.log("SKIP_NODE", { type: "订单已接单", reason: "order.accepted_at 不存在（null，audit_logs 中无 ORDER_ACCEPTED 记录）" })
  }

  // 使用 null 检查，因为 OrderFactContract 使用 null 表示事实不存在
  if (order.completed_at !== null && order.completed_at !== undefined) {
    const completedNode = {
      id: `order-completed-${order.order_id}-${order.completed_at}`,
      type: "order_status" as const,
      label: `订单已完成`,
      operator: order.worker_id || undefined,
      timestamp: order.completed_at,
      orderId: order.order_id,
    }
    console.log("PUSH_NODE", { type: "订单已完成", node: completedNode })
    nodes.push(completedNode)
  } else {
    console.log("SKIP_NODE", { type: "订单已完成", reason: "order.completed_at 不存在（null，audit_logs 中无 ORDER_COMPLETED 记录）" })
  }

  // 注意：所有状态变化都从 audit_logs 中获取，确保事实完整性
  // 目前 OrderFact 类型支持 accepted_at 和 completed_at
  // 其他状态变化（如 delivering）也已在 API 中查询所有 audit_logs 记录

  // 3. 添加溯源记录节点
  if (traces.length === 0) {
    console.log("SKIP_TRACES", { reason: "traces 数组为空，可能导致 UI 看起来'没事实'" })
  } else {
    console.log("PUSH_TRACES", { count: traces.length })
  }

  traces.forEach((trace, index) => {
    const traceNode = {
      id: trace.id,
      type: "trace" as const,
      label: (actionTypeLabelMap[trace.action_type] || trace.action_type), // 使用 labelMap 映射，如果不存在则显示原始 code
      operator: trace.operator_id,
      timestamp: trace.created_at,
      orderId: trace.order_id || undefined,
      assetId: trace.asset_id,
    }
    console.log("PUSH_NODE", { type: "溯源记录", index: index + 1, node: traceNode })
    nodes.push(traceNode)
  })

  // 记录排序前的节点数量和顺序
  console.log("TIMELINE_BEFORE_SORT", {
    node_count: nodes.length,
    node_ids: nodes.map(n => n.id),
    node_timestamps: nodes.map(n => n.timestamp),
  })

  // 4. 按时间排序（从早到晚）
  nodes.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return timeA - timeB
  })

  // 记录排序后的节点数量和顺序
  console.log("TIMELINE_AFTER_SORT", {
    node_count: nodes.length,
    node_ids: nodes.map(n => n.id),
    node_timestamps: nodes.map(n => n.timestamp),
    sorted_correctly: nodes.every((node, index) => {
      if (index === 0) return true
      const prevTime = new Date(nodes[index - 1].timestamp).getTime()
      const currTime = new Date(node.timestamp).getTime()
      return prevTime <= currTime
    }),
  })

  console.log("TIMELINE_OUTPUT", {
    total_nodes: nodes.length,
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.type,
      label: n.label,
      timestamp: n.timestamp,
    })),
  })

  return nodes
}

export function OrderTimeline({ order, traces, className }: OrderTimelineProps) {
  const timelineNodes = mergeTimelineNodes(order, traces)

  if (timelineNodes.length === 0) {
    return (
      <div className={`rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50 p-6 ${className || ""}`}>
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Clock className="w-6 h-6 mr-2" />
          <span className="text-sm">暂无时间线记录</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/50 p-6 ${className || ""}`}>
      <div className="space-y-4">
        {timelineNodes.map((node, index) => {
          const isLast = index === timelineNodes.length - 1
          
          return (
            <div key={node.id} className="relative flex gap-4">
              {/* 时间线连接线 */}
              {!isLast && (
                <div className="absolute left-[11px] top-8 w-0.5 h-full bg-gray-200" />
              )}
              
              {/* 节点图标 */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center">
                  <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />
                </div>
              </div>
              
              {/* 节点内容 */}
              <div className="flex-1 pb-6">
                <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200/50">
                  {/* 行为/标签 */}
                  <div className="flex items-center gap-2 mb-2">
                    {node.type === "trace" ? (
                      <Package className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="font-medium text-gray-900 text-sm">{node.label}</span>
                  </div>
                  
                  {/* 操作人 */}
                  {node.operator && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>操作人：{node.operator}</span>
                    </div>
                  )}
                  
                  {/* 关联订单 */}
                  {node.orderId && node.orderId !== order.order_id && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <Package className="w-3 h-3" />
                      <span>关联订单：{node.orderId}</span>
                    </div>
                  )}
                  
                  {/* 资产ID（溯源记录的事实字段） */}
                  {node.assetId && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <Circle className="w-3 h-3" />
                      <span>资产：{node.assetId}</span>
                    </div>
                  )}
                  
                  {/* 时间 */}
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(node.timestamp)}</span>
                    <span className="ml-1 text-gray-300">·</span>
                    <span>{new Date(node.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
