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
import { logBusinessWarning } from "@/lib/utils/logger"

/**
 * 事实警告级别
 */
export type FactWarningLevel = 'low' | 'medium' | 'high'

/**
 * 事实警告领域
 */
export type FactWarningDomain = 'order' | 'trace' | 'audit'

/**
 * 事实警告代码
 */
export type FactWarningCode =
  | 'FACT_ACCEPTED_AT_MISSING_AUDIT_LOG'
  | 'FACT_TIME_INVERSION'
  | 'FACT_ENUM_VALUE_INVALID'
  | 'FACT_TIMELINE_BREAK'
  | 'FACT_TIMELINE_ANOMALY'

/**
 * 结构化事实警告
 * 
 * 用于后续：
 * - 管理端治理列表
 * - 自动修复任务
 * - 事实健康度可视化
 */
export type FactWarning = {
  /**
   * 警告代码（唯一标识符）
   */
  code: FactWarningCode

  /**
   * 警告级别
   * - low: 可能是合理的异常（如订单创建前的资产操作）
   * - medium: 数据不一致（如枚举值不在允许范围内）
   * - high: 严重的事实违反（如时间逻辑异常）
   */
  level: FactWarningLevel

  /**
   * 警告领域
   * - order: 订单相关
   * - trace: 溯源相关
   * - audit: 审计日志相关
   */
  domain: FactWarningDomain

  /**
   * 人类可读的警告消息
   */
  message: string

  /**
   * 相关字段列表（用于定位问题）
   * 例如：['order.completed_at', 'order.created_at']
   */
  fields: string[]

  /**
   * 原始值快照（只读，用于调试和修复）
   * 包含触发警告的相关数据
   */
  evidence?: any
}

/**
 * 订单事实治理结果
 */
export type OrderFactGovernanceResult = {
  /**
   * 事实警告列表（人类可读格式）
   * 
   * 每个警告描述一个违反事实契约的情况
   * 警告不会阻断 API 响应，但会暴露数据质量问题
   * 
   * @deprecated 保留向后兼容，建议使用 fact_warnings_structured
   */
  fact_warnings: string[]

  /**
   * 结构化事实警告列表
   * 
   * 用于后续自动修复和可视化
   */
  fact_warnings_structured: FactWarning[]
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
  
  /**
   * asset_id 到 device_id 的映射（best-effort）
   * 
   * 用于填充 FactWarning.device_id
   * - 如果 trace.asset_id 能在 devices 表中找到（devices.device_id = trace.asset_id），则填充 device_id
   * - 如果无法关联，device_id 允许为 null
   * 
   * 结构：{ [asset_id: string]: string | null }
   * - key: asset_id（来自 trace.asset_id）
   * - value: device_id（如果 asset_id 在 devices 表中存在，则为 device_id；否则为 null）
   */
  assetIdToDeviceIdMap?: Record<string, string | null>
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
  const warningsStructured: FactWarning[] = []

  const { order, traces, audit_logs, assetIdToDeviceIdMap } = context

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
      const message = `违反事实契约：order.accepted_at 存在（${order.accepted_at}），但 audit_logs 中无对应的 ORDER_ACCEPTED/ORDER_ACCEPT 记录。可能存在数据不一致。`
      warnings.push(message)
      
      warningsStructured.push({
        code: 'FACT_ACCEPTED_AT_MISSING_AUDIT_LOG',
        level: 'medium',
        domain: 'audit',
        message,
        fields: ['order.accepted_at', 'audit_logs.action'],
        evidence: {
          order_id: order.order_id,
          accepted_at: order.accepted_at,
          audit_logs_actions: audit_logs.map(log => log.action),
        },
        detected_at: new Date().toISOString(),
        restaurant_id: order.restaurant_id,
        worker_id: order.worker_id ?? null,
        device_id: null, // 订单级别的警告，不涉及 trace，device_id 为 null
      })
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
      const message = `违反事实契约：order.completed_at（${order.completed_at}）早于 order.created_at（${order.created_at}）。时间逻辑异常。`
      warnings.push(message)
      
      warningsStructured.push({
        code: 'FACT_TIME_INVERSION',
        level: 'high',
        domain: 'order',
        message,
        fields: ['order.completed_at', 'order.created_at'],
        evidence: {
          order_id: order.order_id,
          created_at: order.created_at,
          completed_at: order.completed_at,
          time_diff_ms: completedTime - createdTime,
        },
        detected_at: new Date().toISOString(),
        restaurant_id: order.restaurant_id,
        worker_id: order.worker_id ?? null,
        device_id: null, // 订单级别的警告，不涉及 trace，device_id 为 null
      })
    }
  }

  // ========== 检查 2b：audit_logs 中 ORDER_COMPLETED/ORDER_COMPLETE 记录时间异常 ==========
  // 检查 audit_logs 中所有完成相关的记录，看是否有时间异常的（即使没有被提取到 order.completed_at）
  if (order.created_at) {
    const orderCreatedTime = new Date(order.created_at).getTime()
    
    audit_logs.forEach((log, index) => {
      const actionUpper = log.action?.toUpperCase() || ""
      if (actionUpper === "ORDER_COMPLETED" || actionUpper === "ORDER_COMPLETE") {
        const logCreatedTime = new Date(log.created_at).getTime()
        
        if (logCreatedTime < orderCreatedTime) {
          const message = `违反事实契约：audit_logs[${index}] 中的 ${log.action} 记录（${log.created_at}）早于 order.created_at（${order.created_at}）。时间逻辑异常。`
          warnings.push(message)
          
          warningsStructured.push({
            code: 'FACT_TIME_INVERSION',
            level: 'high',
            domain: 'audit',
            message,
            fields: [`audit_logs[${index}].created_at`, 'order.created_at', `audit_logs[${index}].action`],
            evidence: {
              order_id: order.order_id,
              order_created_at: order.created_at,
              audit_log_index: index,
              audit_log_action: log.action,
              audit_log_created_at: log.created_at,
              time_diff_ms: logCreatedTime - orderCreatedTime,
            },
            detected_at: new Date().toISOString(),
            restaurant_id: order.restaurant_id,
            worker_id: order.worker_id ?? null,
            device_id: null,
          })
        }
      }
    })
  }

  // ========== 检查 2c：audit_logs 中 ORDER_ACCEPTED/ORDER_ACCEPT 记录时间异常 ==========
  // 检查 audit_logs 中所有接单相关的记录，看是否有时间异常的（即使没有被提取到 order.accepted_at）
  if (order.created_at) {
    const orderCreatedTime = new Date(order.created_at).getTime()
    
    audit_logs.forEach((log, index) => {
      const actionUpper = log.action?.toUpperCase() || ""
      if (actionUpper === "ORDER_ACCEPTED" || actionUpper === "ORDER_ACCEPT") {
        const logCreatedTime = new Date(log.created_at).getTime()
        
        if (logCreatedTime < orderCreatedTime) {
          const message = `违反事实契约：audit_logs[${index}] 中的 ${log.action} 记录（${log.created_at}）早于 order.created_at（${order.created_at}）。时间逻辑异常。`
          warnings.push(message)
          
          warningsStructured.push({
            code: 'FACT_TIMELINE_BREAK',
            level: 'high',
            domain: 'audit',
            message,
            fields: [`audit_logs[${index}].created_at`, 'order.created_at', `audit_logs[${index}].action`],
            evidence: {
              order_id: order.order_id,
              order_created_at: order.created_at,
              audit_log_index: index,
              audit_log_action: log.action,
              audit_log_created_at: log.created_at,
              time_diff_ms: logCreatedTime - orderCreatedTime,
            },
            detected_at: new Date().toISOString(),
            restaurant_id: order.restaurant_id,
            worker_id: order.worker_id ?? null,
            device_id: null, // audit_logs 级别的警告，不涉及 trace，device_id 为 null
          })
        }
      }
    })
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
      const message = `违反事实契约：traces[${index}].action_type（${trace.action_type}）不在允许的枚举值内。允许的值：${allowedActionTypes.join(', ')}。`
      warnings.push(message)
      
      warningsStructured.push({
        code: 'FACT_ENUM_VALUE_INVALID',
        level: 'medium',
        domain: 'trace',
        message,
        fields: [`traces[${index}].action_type`],
        evidence: {
          trace_id: trace.id,
          trace_index: index,
          invalid_action_type: trace.action_type,
          allowed_action_types: allowedActionTypes,
        },
        detected_at: new Date().toISOString(),
        restaurant_id: order.restaurant_id,
        worker_id: order.worker_id ?? null,
        device_id: getDeviceId(trace.asset_id, assetIdToDeviceIdMap), // best-effort：从映射中获取 device_id
      })
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
          const message = `违反事实契约：traces[${index}].created_at（${trace.created_at}）早于 order.created_at（${order.created_at}），但该追溯记录关联了当前订单（order_id=${trace.order_id}）。时间线断裂。`
          warnings.push(message)
          
          warningsStructured.push({
            code: 'FACT_TIMELINE_BREAK',
            level: 'high',
            domain: 'trace',
            message,
            fields: [`traces[${index}].created_at`, 'order.created_at', `traces[${index}].order_id`],
            evidence: {
              trace_id: trace.id,
              trace_index: index,
              trace_created_at: trace.created_at,
              trace_order_id: trace.order_id,
              order_id: order.order_id,
              order_created_at: order.created_at,
              time_diff_ms: traceCreatedTime - orderCreatedTime,
            },
            detected_at: new Date().toISOString(),
            restaurant_id: order.restaurant_id,
            worker_id: order.worker_id ?? null,
            device_id: getDeviceId(trace.asset_id, assetIdToDeviceIdMap), // best-effort：从映射中获取 device_id
          })
        } else {
          // 如果 trace.order_id 为空或不同，可能是订单创建前的资产操作，这是合理的
          // 但为了完整性，仍然记录为警告（低优先级）
          const message = `时间线异常（可能合理）：traces[${index}].created_at（${trace.created_at}）早于 order.created_at（${order.created_at}），但该追溯记录未关联当前订单（order_id=${trace.order_id || 'null'}）。可能是订单创建前的资产操作。`
          warnings.push(message)
          
          warningsStructured.push({
            code: 'FACT_TIMELINE_ANOMALY',
            level: 'low',
            domain: 'trace',
            message,
            fields: [`traces[${index}].created_at`, 'order.created_at', `traces[${index}].order_id`],
            evidence: {
              trace_id: trace.id,
              trace_index: index,
              trace_created_at: trace.created_at,
              trace_order_id: trace.order_id || null,
              order_id: order.order_id,
              order_created_at: order.created_at,
              time_diff_ms: traceCreatedTime - orderCreatedTime,
            },
            detected_at: new Date().toISOString(),
            restaurant_id: order.restaurant_id,
            worker_id: order.worker_id ?? null,
            device_id: getDeviceId(trace.asset_id, assetIdToDeviceIdMap), // best-effort：从映射中获取 device_id
          })
        }
      }
    })
  }

  // ========== 记录所有警告（使用 logBusinessWarning，不触发错误弹窗）==========
  if (warnings.length > 0) {
    logBusinessWarning(
      '订单事实治理层',
      `订单 ${order.order_id} 发现 ${warnings.length} 个事实契约违反`,
      warnings
    )
    logBusinessWarning(
      '订单事实治理层',
      '结构化警告详情',
      JSON.stringify(warningsStructured, null, 2)
    )
  }

  return {
    fact_warnings: warnings,
    fact_warnings_structured: warningsStructured,
  }
}

/**
 * 事实健康度汇总结果
 */
export type FactHealthSummary = {
  /**
   * 警告总数
   */
  total: number

  /**
   * 按级别汇总
   */
  by_level: {
    high: number
    medium: number
    low: number
  }

  /**
   * 按代码汇总
   * key: 警告代码
   * value: 该代码出现的次数
   */
  by_code: Record<string, number>

  /**
   * 健康度分数（0-100）
   * - 起始分 100
   * - 每个 high 扣 30
   * - 每个 medium 扣 10
   * - 每个 low 扣 3
   * - 最低为 0
   */
  health_score: number
}

/**
 * 事实健康度汇总（纯只读聚合函数）
 * 
 * 核心原则：
 * - 纯只读函数，不修改任何数据
 * - 不访问数据库
 * - 仅对输入的 FactWarning[] 进行聚合计算
 * 
 * @param warnings 事实警告列表
 * @returns 健康度汇总结果
 */
export function calculateFactHealth(warnings: FactWarning[]): FactHealthSummary {
  // 初始化汇总对象
  const summary: FactHealthSummary = {
    total: warnings.length,
    by_level: {
      high: 0,
      medium: 0,
      low: 0,
    },
    by_code: {},
    health_score: 100,
  }

  // 遍历警告列表，进行聚合统计
  warnings.forEach((warning) => {
    // 按级别统计
    if (warning.level === 'high') {
      summary.by_level.high++
    } else if (warning.level === 'medium') {
      summary.by_level.medium++
    } else if (warning.level === 'low') {
      summary.by_level.low++
    }

    // 按代码统计
    const code = warning.code
    if (!summary.by_code[code]) {
      summary.by_code[code] = 0
    }
    summary.by_code[code]++
  })

  // 计算健康度分数
  // 起始分 100
  let score = 100

  // 每个 high 扣 30
  score -= summary.by_level.high * 30

  // 每个 medium 扣 10
  score -= summary.by_level.medium * 10

  // 每个 low 扣 3
  score -= summary.by_level.low * 3

  // 最低为 0
  summary.health_score = Math.max(0, score)

  return summary
}
