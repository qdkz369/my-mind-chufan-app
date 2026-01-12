/**
 * 事实对象类型定义
 * 
 * 核心原则：
 * - 事实对象只包含"真实发生"的数据，不包含业务解释或判断
 * - 禁止包含：is_abnormal, risk_level, score, comment 等业务解释字段
 * - 所有字段都应该是事实数据库中的真实记录
 * 
 * 数据来源：
 * - OrderFact: delivery_orders 表
 * - AssetFact: gas_cylinders / devices 表
 * - TraceFact: trace_logs 表
 */

/**
 * 订单事实（Order Fact）
 * 
 * 数据来源：delivery_orders 表
 * 
 * 说明：
 * - order_id: 订单唯一标识（对应 delivery_orders.id）
 * - restaurant_id: 餐厅ID（订单归属）
 * - status: 订单状态（pending, accepted, delivering, completed, exception, rejected, cancelled）
 * - created_at: 订单创建时间
 * - accepted_at: 订单被接单时间（可选，状态为 accepted 或之后才存在）
 * - completed_at: 订单完成时间（可选，状态为 completed 才存在）
 * - worker_id: 配送员ID（可选，订单被接单后才存在）
 */
export type OrderFact = {
  order_id: string
  restaurant_id: string
  status: string
  created_at: string
  accepted_at?: string
  completed_at?: string
  worker_id?: string
}

/**
 * 资产事实（Asset Fact）
 * 
 * 数据来源：gas_cylinders / devices 表
 * 
 * 说明：
 * - asset_id: 资产唯一标识（对应 gas_cylinders.id 或 devices.device_id）
 * - status: 资产当前状态（active, inactive, maintenance, delivered, returned 等）
 * - last_action: 最后一次操作类型（从 trace_logs 表聚合得出，如果没有溯源记录则为空字符串）
 * - last_action_at: 最后一次操作时间（从 trace_logs 表聚合得出，如果没有溯源记录则使用资产的 updated_at 或 created_at）
 */
export type AssetFact = {
  asset_id: string
  status: string
  last_action: string
  last_action_at: string
}

/**
 * 溯源事实（Trace Fact）
 * 
 * 数据来源：trace_logs 表
 * 
 * 说明：
 * - id: 溯源记录唯一标识（对应 trace_logs.id）
 * - asset_id: 资产ID（被操作的资产）
 * - action_type: 操作类型（出厂、充装、配送、回收、安检）
 * - operator_id: 操作人ID（执行操作的人）
 * - order_id: 关联订单ID（可选，如果是与订单相关的操作）
 * - created_at: 操作时间（对应 trace_logs.created_at）
 */
export type TraceFact = {
  id: string
  asset_id: string
  action_type: '出厂' | '充装' | '配送' | '回收' | '安检'
  operator_id: string
  order_id?: string
  created_at: string
}

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
  | 'FACT_COMPLETED_AT_MISSING_AUDIT_LOG'
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
 * - 观察层（Observation Layer）统计和归因
 * 
 * @remarks Observation Layer 标准维度字段
 * 
 * Observation Layer 可以依赖以下字段作为标准维度进行统计和归因：
 * - `detected_at`: 警告检测时间（用于按时间窗口统计）
 * - `level`: 警告级别（用于按风险级别聚合）
 * - `restaurant_id`: 餐厅ID（用于按餐厅归因）
 * - `worker_id`: 配送员ID（用于按配送员归因）
 * - `device_id`: 设备ID（用于按设备归因）
 * 
 * 重要说明：
 * - Observation Layer 可以假设这些字段存在（即使可能为 null）
 * - 不应再通过 `order` / `trace` / `evidence` 反向推断这些维度
 * - 这些字段已在 Facts API 生成警告时直接填充，无需额外查询
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

  /**
   * 警告检测时间（ISO 8601 格式）
   * 用于按时间窗口统计警告
   * 来源：Facts API 生成警告时的系统时间
   */
  detected_at?: string

  /**
   * 餐厅ID（警告的直接归因对象）
   * 用于按餐厅归因统计
   * 来源：order.restaurant_id（delivery_orders.restaurant_id）
   */
  restaurant_id?: string

  /**
   * 配送员ID（警告的直接归因对象）
   * 用于按配送员归因统计
   * 来源：order.worker_id（delivery_orders.worker_id）
   */
  worker_id?: string | null

  /**
   * 设备ID（警告的直接归因对象）
   * 用于按设备归因统计
   * 来源：从 trace.asset_id 或 asset.asset_id 关联查询 devices 表获取
   */
  device_id?: string | null
}