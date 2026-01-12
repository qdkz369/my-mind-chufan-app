/**
 * Usage Snapshot 类型定义
 * 
 * 说明：
 * - UsageSnapshot 是"计费前冻结事实"
 * - 用于冻结设备在某一时间窗口内的"可计费使用事实"
 * - 只消费 Facts 结果，不反向影响 Facts
 * - usage_value 只是"量"（使用量），不是"钱"（金额）
 * - 对应表：usage_snapshots
 * 
 * ⛔ Usage Snapshot 阶段明确禁止事项（非常重要）：
 * 1. 禁止生成账单：禁止基于 Usage Snapshot 生成账单（bill/invoice）
 * 2. 禁止生成应收应付：禁止基于 Usage Snapshot 生成应收/应付
 * 3. 禁止计算金额：禁止基于 usage_value 计算任何金额
 * 4. 禁止对订单状态产生任何反向影响：禁止基于 Snapshot 修改订单状态、阻止订单创建、触发订单流程变更
 * 5. 禁止在 Snapshot 中修改或纠正 Facts：禁止修改 Facts 数据、纠正 Facts 值、反向更新 Facts 表
 * 
 * 设计原则：
 * - 不引用 payment、orders、facts 内部实现
 * - 类型字段与 usage_snapshots 表结构完全一致
 */

/**
 * 使用量快照（计费前冻结事实）
 * 
 * 用途：
 * - 冻结设备在某一时间窗口内的"可计费使用事实"
 * - 用于后续计费计算（但本类型不涉及金额计算）
 * - 确保快照生成时的 Facts 状态可追溯
 * 
 * 数据来源：
 * - fact_source: 明确标识数据来源（order_facts / device_facts / manual_override）
 * - generated_from_fact_at: Facts 中最新事实时间
 * 
 * 状态流转：
 * - draft: 草稿（可修改）
 * - confirmed: 已确认（可修改）
 * - disputed: 争议中（可修改）
 * - locked: 已锁定（不可修改，业务逻辑约束）
 * 
 * 对应表：usage_snapshots
 */
export interface UsageSnapshot {
  /**
   * 快照ID
   */
  id: string

  /**
   * 租赁合同ID
   * 关联到 rental_contracts.id
   */
  rental_contract_id: string

  /**
   * 设备ID
   */
  device_id: string

  /**
   * 快照开始时间（时间窗口起点）
   * ISO 8601 timestamp
   */
  snapshot_start_at: string

  /**
   * 快照结束时间（时间窗口终点）
   * ISO 8601 timestamp
   */
  snapshot_end_at: string

  /**
   * 使用量计量单位
   * - hours: 小时数
   * - orders: 订单数
   * - energy: 能耗值
   * - hybrid: 混合模式
   */
  usage_metric: 'hours' | 'orders' | 'energy' | 'hybrid'

  /**
   * 使用量数值
   * 
   * 重要说明：
   * - usage_value 只是"量"（使用量），不是"钱"（金额）
   * - 例如：hours=100（小时数）、orders=50（订单数）、energy=1000.5（能耗值）
   * - 不包含任何金额计算逻辑
   * - 不涉及结算、支付、发票
   * 
   * 类型：DECIMAL(20, 6)
   */
  usage_value: number

  /**
   * 事实来源
   * 
   * 明确写死来源，确保可追溯：
   * - order_facts: 来自订单事实（Facts API）
   * - device_facts: 来自设备事实（Facts API）
   * - manual_override: 手动覆盖（特殊情况）
   * 
   * 说明：
   * - 不引用 facts 内部实现
   * - 只记录来源标识，不包含具体事实数据
   */
  fact_source: 'order_facts' | 'device_facts' | 'manual_override'

  /**
   * Facts 中最新事实时间
   * 
   * 用途：
   * - 追溯快照生成时的 Facts 状态
   * - 确保快照与 Facts 的时间一致性
   * 
   * ISO 8601 timestamp
   */
  generated_from_fact_at: string

  /**
   * 快照状态
   * 
   * 状态说明：
   * - draft: 草稿（可修改）
   * - confirmed: 已确认（可修改）
   * - disputed: 争议中（可修改）
   * - locked: 已锁定（不可修改，业务逻辑约束）
   * 
   * 注意：
   * - status=locked 后不可修改（业务逻辑约束，不在数据库层面强制）
   */
  status: 'draft' | 'confirmed' | 'disputed' | 'locked'

  /**
   * 创建时间
   * ISO 8601 timestamp
   */
  created_at: string

  /**
   * 更新时间
   * ISO 8601 timestamp
   */
  updated_at: string
}
