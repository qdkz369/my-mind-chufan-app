/**
 * 订单事实契约（Order Fact Contract）
 * 
 * 核心原则：
 * - 明确每一个字段的唯一数据来源
 * - 禁止任何"推断""默认""兜底时间"
 * - 空值必须明确表达"事实不存在"或"尚未发生"
 * - 任何 UI 不得自行生成或推断时间
 * 
 * 数据来源约束：
 * - accepted_at / completed_at 只能来自 audit_logs
 * - trace_logs 只能作为事实补充，不得反推订单状态
 */

/**
 * 订单事实契约
 * 
 * 每个字段必须明确：
 * - 字段名
 * - 数据来源表（delivery_orders / audit_logs / trace_logs）
 * - 是否允许为空
 * - 空值含义（如：事实不存在 / 尚未发生）
 */
export type OrderFactContract = {
  /**
   * 订单唯一标识
   * 
   * 数据来源：delivery_orders.id
   * 是否允许为空：否
   * 空值含义：不适用（必填字段）
   */
  order_id: string

  /**
   * 餐厅ID（订单归属）
   * 
   * 数据来源：delivery_orders.restaurant_id
   * 是否允许为空：否
   * 空值含义：不适用（必填字段）
   */
  restaurant_id: string

  /**
   * 订单状态（当前状态）
   * 
   * 数据来源：delivery_orders.status
   * 是否允许为空：否
   * 空值含义：不适用（必填字段）
   * 
   * 可能值：pending, accepted, delivering, completed, exception, rejected, cancelled
   * 
   * ⚠️ Behavior Timeline：
   * - 此字段对应 BehaviorTimelineState.current_state
   * - 与 previous_state 和 next_expected_state 一起构成行为时间线
   */
  status: string

  /**
   * 前一个状态（Behavior Timeline）
   * 
   * 数据来源：audit_logs（从状态变化历史推断）或 null
   * 是否允许为空：是
   * 空值含义：初始状态（无前一个状态）
   * 
   * ⚠️ Behavior Timeline：
   * - 用于判断状态变化轨迹
   * - 与 current_state（status）和 next_expected_state 一起构成行为时间线
   */
  previous_state: string | null

  /**
   * 下一个预期状态（Behavior Timeline）
   * 
   * 数据来源：业务规则定义（由 Facts API 计算）或 null
   * 是否允许为空：是
   * 空值含义：无预期状态（可能是终态，或尚未定义预期）
   * 
   * ⚠️ Behavior Timeline：
   * - 用于判断是否偏离预期轨迹
   * - 与 previous_state 和 current_state（status）一起构成行为时间线
   * - ViewModel 应使用此字段判断偏离，而非判断"异常"
   */
  next_expected_state: string | null

  /**
   * 订单创建时间
   * 
   * 数据来源：delivery_orders.created_at
   * 是否允许为空：否
   * 空值含义：不适用（必填字段）
   */
  created_at: string

  /**
   * 订单被接单时间
   * 
   * 数据来源：audit_logs.created_at（当 action = ORDER_ACCEPTED 或 ORDER_ACCEPT）
   * 是否允许为空：是
   * 空值含义：事实不存在（audit_logs 中无 ORDER_ACCEPTED 记录）
   * 
   * 约束：
   * - 只能来自 audit_logs 表
   * - 严禁从 delivery_orders.status 推断
   * - 严禁使用 delivery_orders.updated_at 作为兜底
   * - 严禁 UI 自行生成或推断时间
   */
  accepted_at: string | null

  /**
   * 订单完成时间
   * 
   * 数据来源：audit_logs.created_at（当 action = ORDER_COMPLETED 或 ORDER_COMPLETE）
   * 是否允许为空：是
   * 空值含义：事实不存在（audit_logs 中无 ORDER_COMPLETED 记录）
   * 
   * 约束：
   * - 只能来自 audit_logs 表
   * - 严禁从 delivery_orders.status 推断
   * - 严禁使用 delivery_orders.updated_at 作为兜底
   * - 严禁 UI 自行生成或推断时间
   */
  completed_at: string | null

  /**
   * 配送员ID
   * 
   * 数据来源：delivery_orders.worker_id
   * 是否允许为空：是
   * 空值含义：事实不存在（订单尚未分配配送员）
   */
  worker_id: string | null
}

/**
 * 溯源事实契约
 * 
 * 数据来源：trace_logs 表
 * 
 * 约束：
 * - trace_logs 只能作为事实补充，不得反推订单状态
 * - 不得从 trace_logs 推断 accepted_at 或 completed_at
 */
export type TraceFactContract = {
  /**
   * 溯源记录唯一标识
   * 
   * 数据来源：trace_logs.id
   * 是否允许为空：否
   */
  id: string

  /**
   * 资产ID（被操作的资产）
   * 
   * 数据来源：trace_logs.asset_id
   * 是否允许为空：否
   */
  asset_id: string

  /**
   * 操作类型（英文 code）
   * 
   * 数据来源：trace_logs.action_type
   * 是否允许为空：否
   * 
   * 可能值：
   * - ASSET_CREATED: 资产创建（出厂）
   * - ASSET_FILLED: 资产充装
   * - ASSET_DELIVERED: 资产配送
   * - ASSET_RETURNED: 资产回收
   * - ASSET_INSPECTED: 资产安检
   * 
   * 注意：这是事实层 code，中文标签应在 UI 层通过 labelMap 映射
   */
  action_type:
    | 'ASSET_CREATED'
    | 'ASSET_FILLED'
    | 'ASSET_DELIVERED'
    | 'ASSET_RETURNED'
    | 'ASSET_INSPECTED'

  /**
   * 操作人ID
   * 
   * 数据来源：trace_logs.operator_id
   * 是否允许为空：否
   */
  operator_id: string

  /**
   * 关联订单ID
   * 
   * 数据来源：trace_logs.order_id
   * 是否允许为空：是
   * 空值含义：事实不存在（该操作不关联订单）
   */
  order_id: string | null

  /**
   * 操作时间
   * 
   * 数据来源：trace_logs.created_at
   * 是否允许为空：否
   */
  created_at: string
}

/**
 * 资产事实契约
 * 
 * 数据来源：gas_cylinders / devices 表 + trace_logs 表（聚合）
 */
export type AssetFactContract = {
  /**
   * 资产唯一标识
   * 
   * 数据来源：gas_cylinders.id 或 devices.device_id
   * 是否允许为空：否
   */
  asset_id: string

  /**
   * 资产当前状态（当前状态）
   * 
   * 数据来源：gas_cylinders.status 或 devices.status
   * 是否允许为空：否
   * 
   * ⚠️ Behavior Timeline：
   * - 此字段对应 BehaviorTimelineState.current_state
   * - 与 previous_state 和 next_expected_state 一起构成行为时间线
   */
  status: string

  /**
   * 前一个状态（Behavior Timeline）
   * 
   * 数据来源：trace_logs（从操作历史推断）或 null
   * 是否允许为空：是
   * 空值含义：初始状态（无前一个状态）
   * 
   * ⚠️ Behavior Timeline：
   * - 用于判断状态变化轨迹
   * - 与 current_state（status）和 next_expected_state 一起构成行为时间线
   */
  previous_state: string | null

  /**
   * 下一个预期状态（Behavior Timeline）
   * 
   * 数据来源：业务规则定义（由 Facts API 计算）或 null
   * 是否允许为空：是
   * 空值含义：无预期状态（可能是终态，或尚未定义预期）
   * 
   * ⚠️ Behavior Timeline：
   * - 用于判断是否偏离预期轨迹
   * - 与 previous_state 和 current_state（status）一起构成行为时间线
   * - ViewModel 应使用此字段判断偏离，而非判断"异常"
   */
  next_expected_state: string | null

  /**
   * 最后一次操作类型
   * 
   * 数据来源：trace_logs.action_type（最后一次操作）
   * 是否允许为空：是（空字符串表示事实不存在）
   * 空值含义：事实不存在（trace_logs 中无该资产的记录）
   * 
   * 约束：
   * - 只能来自 trace_logs 表
   * - 如果 trace_logs 中无记录，必须为空字符串 ""，不得推断
   */
  last_action: string

  /**
   * 最后一次操作时间
   * 
   * 数据来源：trace_logs.created_at（最后一次操作时间）
   * 
   * 是否允许为空：是
   * 空值含义：资产从未产生任何 trace 行为（trace_logs 中无该资产的记录）
   * 
   * 约束：
   * - 只能来自 trace_logs.created_at（行为发生时间）
   * - 不得使用 gas_cylinders.updated_at 或 devices.updated_at 作为兜底
   * - 不得使用 gas_cylinders.created_at 或 devices.created_at 伪装为 action 时间
   * - 如果 trace_logs 无记录，必须为 null，不得推断
   * 
   * 原因：updated_at ≠ 行为发生时间，否则在"事故追溯"时会被反噬
   */
  last_action_at: string | null
}

/**
 * 订单事实契约验证工具
 * 
 * 用于验证 OrderFactContract 是否符合契约约束
 */
export function validateOrderFactContract(fact: OrderFactContract): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 验证必填字段
  if (!fact.order_id) {
    errors.push("order_id 是必填字段，不能为空")
  }
  if (!fact.restaurant_id) {
    errors.push("restaurant_id 是必填字段，不能为空")
  }
  if (!fact.status) {
    errors.push("status 是必填字段，不能为空")
  }
  if (!fact.created_at) {
    errors.push("created_at 是必填字段，不能为空")
  }

  // 验证 accepted_at 和 completed_at 不能是 undefined（必须是 string | null）
  if (fact.accepted_at === undefined) {
    errors.push("accepted_at 必须是 string | null，不能是 undefined（使用 null 表示事实不存在）")
  }
  if (fact.completed_at === undefined) {
    errors.push("completed_at 必须是 string | null，不能是 undefined（使用 null 表示事实不存在）")
  }

  // 验证 worker_id 不能是 undefined（必须是 string | null）
  if (fact.worker_id === undefined) {
    errors.push("worker_id 必须是 string | null，不能是 undefined（使用 null 表示事实不存在）")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
