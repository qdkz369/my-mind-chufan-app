/**
 * 订单时间线 ViewModel
 * 
 * 职责：
 * - 将 OrderFactContract + TraceFactContract[] 转换为 UI 可用的时间线数据
 * - 完成时间格式化
 * - 完成语义转换（状态代码 → 中文标签）
 * - 不暴露任何 Fact 原始字段名给 UI
 * - 根据 View Perspective 决定展示字段、文案语气、系统字段
 * 
 * 原则：
 * - 不引入业务判断
 * - 不进行数据库查询
 * - 仅做字段映射、格式化、语义转换
 * - Facts Adapter 输出的是"中性事实"
 * - ViewModel 根据 perspective 决定展示字段、文案语气、是否显示系统字段
 */

import { OrderFactContract, TraceFactContract } from "@/lib/facts/contracts/order.fact"
import { ViewPerspective, getViewPerspectiveConfig } from "@/lib/view-perspective"

/**
 * 时间线节点类型
 * 
 * 注意：字段名不暴露 Facts 原始字段名
 */
export type TimelineNode = {
  /**
   * 节点唯一标识
   */
  id: string

  /**
   * 节点类型
   * - order_status: 订单状态变化
   * - trace: 溯源记录
   */
  nodeType: "order_status" | "trace"

  /**
   * 显示标签（已转换为中文）
   */
  label: string

  /**
   * 操作人ID（可选）
   */
  operatorId?: string

  /**
   * 格式化后的时间显示（如："2024-01-01 12:00" 或 "2小时前"）
   */
  timeDisplay: string

  /**
   * 原始时间戳（ISO 8601 格式，用于排序和精确时间）
   */
  timestamp: string

  /**
   * 关联订单ID（可选）
   */
  relatedOrderId?: string

  /**
   * 关联资产ID（可选，仅 trace 类型节点有）
   */
  relatedAssetId?: string
}

/**
 * 订单时间线 ViewModel
 */
export type OrderTimelineViewModel = {
  /**
   * View Perspective（视图视角）
   */
  perspective: ViewPerspective

  /**
   * 订单ID（已映射，不暴露 order_id）
   * 注意：根据 perspective.showSystemFields 决定是否显示
   */
  orderId: string

  /**
   * 时间线节点列表（按时间从早到晚排序）
   */
  timeline: TimelineNode[]
}

/**
 * 根据 View Perspective 获取订单状态标签
 * 
 * 示例：
 * - user: "配送中"
 * - worker: "当前任务"
 * - admin: "order_status = delivering"
 */
function getOrderStatusLabel(status: string, perspective: ViewPerspective): string {
  const perspectiveConfig = getViewPerspectiveConfig(perspective)
  
  // Admin 视角：显示系统字段格式
  if (perspectiveConfig.showSystemFields) {
    return `order_status = ${status}`
  }
  
  // 基础状态映射（用于 user、worker、supplier）
  const baseStatusLabelMap: Record<string, string> = {
    pending: "待接单",
    accepted: "已接单",
    delivering: "配送中",
    completed: "已完成",
    exception: "异常",
    rejected: "已拒绝",
    cancelled: "已取消",
  }
  
  const baseLabel = baseStatusLabelMap[status] || status
  
  // Worker 视角：针对特定状态使用操作相关文案
  if (perspective === 'worker') {
    const workerStatusLabelMap: Record<string, string> = {
      pending: "待接单",
      accepted: "当前任务",
      delivering: "当前任务",
      completed: "已完成",
      exception: "异常",
      rejected: "已拒绝",
      cancelled: "已取消",
    }
    return workerStatusLabelMap[status] || baseLabel
  }
  
  // User 和 Supplier 视角：使用基础映射
  return baseLabel
}

/**
 * 操作类型显示映射（语义转换）
 */
const actionTypeLabelMap: Record<string, string> = {
  ASSET_CREATED: "出厂",
  ASSET_FILLED: "充装",
  ASSET_DELIVERED: "配送",
  ASSET_RETURNED: "回收",
  ASSET_INSPECTED: "安检",
}

/**
 * 格式化时间显示
 * 
 * 规则：
 * - 1分钟内：显示"刚刚"
 * - 1小时内：显示"X分钟前"
 * - 24小时内：显示"X小时前"
 * - 7天内：显示"X天前"
 * - 超过7天：显示具体日期时间（如："01-01 12:00"）
 */
function formatTimeDisplay(timestamp: string): string {
  if (!timestamp) {
    return "未知"
  }

  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) {
      return "刚刚"
    }
    if (diffMins < 60) {
      return `${diffMins}分钟前`
    }
    if (diffHours < 24) {
      return `${diffHours}小时前`
    }
    if (diffDays < 7) {
      return `${diffDays}天前`
    }

    // 超过7天，显示具体日期时间
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
 * 将订单事实和溯源记录转换为时间线 ViewModel
 * 
 * @param order - 订单事实契约
 * @param traces - 溯源记录数组
 * @param perspective - 视图视角（决定展示字段、文案语气、系统字段）
 * @returns 订单时间线 ViewModel
 */
export function convertOrderFactsToTimelineViewModel(
  order: OrderFactContract,
  traces: TraceFactContract[],
  perspective: ViewPerspective = 'user'
): OrderTimelineViewModel {
  const perspectiveConfig = getViewPerspectiveConfig(perspective)
  const nodes: TimelineNode[] = []

  // 1. 添加订单创建节点
  const statusLabel = getOrderStatusLabel(order.status, perspective)
  nodes.push({
    id: `order-created-${order.order_id}`,
    nodeType: "order_status",
    label: perspectiveConfig.showSystemFields 
      ? `订单创建：order_status = ${order.status}`
      : `订单创建：${statusLabel}`,
    timeDisplay: formatTimeDisplay(order.created_at),
    timestamp: order.created_at,
    relatedOrderId: perspectiveConfig.showSystemFields ? order.order_id : undefined,
  })

  // 2. 添加订单状态变化节点（从 audit_logs 获取的事实）
  // 注意：按照"不推断"原则，只显示实际存在的状态变化记录
  // 使用 null 检查，因为 OrderFactContract 使用 null 表示事实不存在
  if (order.accepted_at !== null && order.accepted_at !== undefined) {
    const acceptedLabel = perspectiveConfig.showSystemFields
      ? "订单已接单：order_status = accepted"
      : perspective === 'worker'
        ? "当前任务"
        : "订单已接单"
    
    nodes.push({
      id: `order-accepted-${order.order_id}-${order.accepted_at}`,
      nodeType: "order_status",
      label: acceptedLabel,
      operatorId: perspectiveConfig.showSystemFields ? order.worker_id || undefined : undefined,
      timeDisplay: formatTimeDisplay(order.accepted_at),
      timestamp: order.accepted_at,
      relatedOrderId: perspectiveConfig.showSystemFields ? order.order_id : undefined,
    })
  }

  if (order.completed_at !== null && order.completed_at !== undefined) {
    const completedLabel = perspectiveConfig.showSystemFields
      ? "订单已完成：order_status = completed"
      : "订单已完成"
    
    nodes.push({
      id: `order-completed-${order.order_id}-${order.completed_at}`,
      nodeType: "order_status",
      label: completedLabel,
      operatorId: perspectiveConfig.showSystemFields ? order.worker_id || undefined : undefined,
      timeDisplay: formatTimeDisplay(order.completed_at),
      timestamp: order.completed_at,
      relatedOrderId: perspectiveConfig.showSystemFields ? order.order_id : undefined,
    })
  }

  // 3. 添加溯源记录节点
  traces.forEach((trace) => {
    const actionLabel = perspectiveConfig.showSystemFields
      ? `action_type = ${trace.action_type}`
      : actionTypeLabelMap[trace.action_type] || trace.action_type
    
    nodes.push({
      id: trace.id,
      nodeType: "trace",
      label: actionLabel,
      operatorId: perspectiveConfig.showSystemFields ? trace.operator_id : undefined,
      timeDisplay: formatTimeDisplay(trace.created_at),
      timestamp: trace.created_at,
      relatedOrderId: perspectiveConfig.showSystemFields ? (trace.order_id || undefined) : undefined,
      relatedAssetId: perspectiveConfig.showSystemFields ? trace.asset_id : undefined,
    })
  })

  // 4. 按时间排序（从早到晚）
  nodes.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return timeA - timeB
  })

  return {
    perspective,
    orderId: order.order_id, // 字段映射：order_id → orderId（根据 perspective.showSystemFields 决定是否显示）
    timeline: nodes,
  }
}
