/**
 * 订单事实治理层（Order Fact Governance Layer）
 * 
 * 核心原则：
 * - 治理层负责"暴露异常事实"，而非"修复事实"
 * - 所有违反事实契约的情况必须被记录，但不得阻断 API 响应
 * - UI 层只能展示事实，不得修复或推断
 * 
 * 与"校验"的区别：
 * - 校验（Validation）：在数据进入系统前检查格式、必填项等，不符合则拒绝
 * - 治理（Governance）：在数据返回前检查事实一致性，不符合则记录警告，但仍返回数据
 * 
 * 治理层的作用：
 * - 暴露数据质量问题（如：accepted_at 存在但 audit_logs 无记录）
 * - 暴露时间逻辑异常（如：completed_at 早于 created_at）
 * - 暴露枚举值异常（如：action_type 不在允许范围内）
 * - 暴露时间线断裂（如：trace.created_at 早于 order.created_at）
 * 
 * 所有异常必须通过 fact_warnings 显性暴露，让调用方知道"数据有问题"
 */

import { OrderFactContract, TraceFactContract } from "@/lib/facts/contracts/order.fact"

/**
 * 订单事实治理结果
 */
export type OrderFactGovernanceResult = {
  /**
   * 事实警告列表
   * 
   * 每个警告描述一个违反事实契约的情况
   * 警告不会阻断 API 响应，但会暴露数据质量问题
   */
  fact_warnings: string[]
}

/**
 * 订单事实治理上下文
 * 
 * 包含治理所需的所有上下文信息
 */
export type OrderFactGovernanceContext = {
  /**
   * 订单事实
   */
  order: OrderFactContract
  
  /**
   * 溯源事实列表
   */
  traces: TraceFactContract[]
  
  /**
   * audit_logs 原始数据（用于验证 accepted_at / completed_at 是否真实存在）
   * 
   * 结构：{ action: string, created_at: string }[]
   */
  audit_logs: Array<{
    action: string
    created_at: string
  }>
}

/**
 * 订单事实治理器
 * 
 * 在 API 层返回数据前强制执行事实契约检查
 * 
 * @param context 治理上下文
 * @returns 治理结果（包含 fact_warnings）
 */
export function OrderFactGuard(
  context: OrderFactGovernanceContext
): OrderFactGovernanceResult {
  const warnings: string[] = []

  const { order, traces, audit_logs } = context

  // ========== 检查 1：accepted_at 存在但 audit_logs 中无对应记录 ==========
  if (order.accepted_at !== null && order.accepted_at !== undefined) {
    // 检查 audit_logs 中是否存在 ORDER_ACCEPTED 或 ORDER_ACCEPT 记录
    const hasAcceptRecord = audit_logs.some((log) => {
      const actionUpper = log.action?.toUpperCase() || ""
      return (
        actionUpper === "ORDER_ACCEPTED" || 
        actionUpper === "ORDER_ACCEPT"
      )
    })

    if (!hasAcceptRecord) {
      warnings.push(
        `违反事实契约：order.accepted_at 存在（${order.accepted_at}），但 audit_logs 中无对应的 ORDER_ACCEPTED/ORDER_ACCEPT 记录。可能存在数据不一致。`
      )
    }
  }

  // ========== 检查 2：completed_at 早于 created_at ==========
  if (
    order.completed_at !== null &&
    order.completed_at !== undefined &&
    order.created_at
  ) {
    const completedTime = new Date(order.completed_at).getTime()
    const createdTime = new Date(order.created_at).getTime()

    if (completedTime < createdTime) {
      warnings.push(
        `违反事实契约：order.completed_at（${order.completed_at}）早于 order.created_at（${order.created_at}）。时间逻辑异常。`
      )
    }
  }

  // ========== 检查 3：trace.action_type 不在允许枚举内 ==========
  const allowedActionTypes: TraceFactContract['action_type'][] = [
    'ASSET_CREATED',
    'ASSET_FILLED',
    'ASSET_DELIVERED',
    'ASSET_RETURNED',
    'ASSET_INSPECTED',
  ]

  traces.forEach((trace, index) => {
    if (!allowedActionTypes.includes(trace.action_type)) {
      warnings.push(
        `违反事实契约：traces[${index}].action_type（${trace.action_type}）不在允许的枚举值内。允许的值：${allowedActionTypes.join(', ')}。`
      )
    }
  })

  // ========== 检查 4：trace.created_at 早于 order.created_at 且无明确说明 ==========
  if (order.created_at) {
    const orderCreatedTime = new Date(order.created_at).getTime()

    traces.forEach((trace, index) => {
      const traceCreatedTime = new Date(trace.created_at).getTime()

      if (traceCreatedTime < orderCreatedTime) {
        // 检查是否有明确说明（例如：trace.order_id 不为空，表示这是订单关联的追溯记录）
        // 如果没有 order_id，则可能是"订单创建前的资产操作"，这是合理的
        // 但如果 trace.order_id === order.order_id，则说明这是订单关联的追溯，不应该早于订单创建
        if (trace.order_id === order.order_id) {
          warnings.push(
            `违反事实契约：traces[${index}].created_at（${trace.created_at}）早于 order.created_at（${order.created_at}），但该追溯记录关联了当前订单（order_id=${trace.order_id}）。时间线断裂。`
          )
        } else {
          // 如果 trace.order_id 为空或不同，可能是订单创建前的资产操作，这是合理的
          // 但为了完整性，仍然记录为警告（低优先级）
          warnings.push(
            `时间线异常（可能合理）：traces[${index}].created_at（${trace.created_at}）早于 order.created_at（${order.created_at}），但该追溯记录未关联当前订单（order_id=${trace.order_id || 'null'}）。可能是订单创建前的资产操作。`
          )
        }
      }
    })
  }

  // ========== 记录所有警告到 error log ==========
  if (warnings.length > 0) {
    console.error(
      `[订单事实治理层] 订单 ${order.order_id} 发现 ${warnings.length} 个事实契约违反：`,
      warnings
    )
  }

  return {
    fact_warnings: warnings,
  }
}
