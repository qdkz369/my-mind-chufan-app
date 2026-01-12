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
