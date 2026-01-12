/**
 * 订单状态枚举
 * 状态流转：pending_install -> pending_acceptance -> active -> processing -> delivering -> completed
 */
export enum OrderStatus {
  PENDING_INSTALL = "pending_install", // 待安装
  PENDING_ACCEPTANCE = "pending_acceptance", // 待验收
  ACTIVE = "active", // 已激活/待下单
  PROCESSING = "processing", // 待派单
  DELIVERING = "delivering", // 配送中
  COMPLETED = "completed", // 已完成
}

/**
 * 产品类型枚举
 */
export enum ProductType {
  LPG = "lpg", // 液化气
  METHANOL = "methanol", // 甲醇
  CLEAN_FUEL = "clean_fuel", // 热能清洁燃料
  OUTDOOR_FUEL = "outdoor_fuel", // 户外环保燃料
}

/**
 * 订单接口定义
 */
export interface Order {
  id: string
  restaurant_id: string
  product_type: ProductType | null // 产品类型
  service_type: string // 服务类型（兼容旧字段）
  status: OrderStatus
  amount: number
  assigned_to: string | null // 指派配送员ID
  worker_id: string | null // 兼容旧字段
  tracking_code: string | null // 瓶身溯源二维码内容
  proof_image: string | null // 配送图片凭证URL
  customer_confirmed: boolean // 客户是否确认验收
  created_at: string
  updated_at: string
}

/**
 * 订单状态流转规则
 */
export const OrderStatusFlow = {
  [OrderStatus.PENDING_INSTALL]: [OrderStatus.PENDING_ACCEPTANCE],
  [OrderStatus.PENDING_ACCEPTANCE]: [OrderStatus.ACTIVE],
  [OrderStatus.ACTIVE]: [OrderStatus.PROCESSING],
  [OrderStatus.PROCESSING]: [OrderStatus.DELIVERING],
  [OrderStatus.DELIVERING]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [], // 已完成状态不能再流转
}

/**
 * 配送订单（delivery_orders）状态类型
 * 阶段 2B-5：业务现实化 · 状态治理 · 可运营系统
 */
export type DeliveryOrderStatus =
  | "pending"        // 待接单
  | "accepted"       // 已接单
  | "delivering"     // 配送中
  | "completed"      // 已完成
  | "rejected"       // 被拒单
  | "cancelled"      // 用户取消
  | "exception"      // 异常挂起
  | "returned"       // 退回（未完成）

/**
 * 配送订单（delivery_orders）专用状态流转规则（白名单）
 * 阶段 2B-5：业务现实化 · 状态治理 · 可运营系统
 * 
 * 规则：
 * - pending 可以流转到 accepted（接单）、rejected（拒单）、cancelled（取消）
 * - accepted 可以流转到 delivering（派单）、exception（异常）
 * - delivering 可以流转到 completed（完成）、exception（异常）、returned（退回）
 * - exception 可以流转到 delivering（恢复）、returned（退回）、cancelled（取消）
 * - returned、rejected、cancelled、completed 为终态，不能流转
 */
export const ORDER_STATUS_FLOW: Record<DeliveryOrderStatus, DeliveryOrderStatus[]> = {
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["delivering", "exception"],
  delivering: ["completed", "exception", "returned"],
  exception: ["delivering", "returned", "cancelled"],
  returned: [],    // 终态
  rejected: [],    // 终态
  cancelled: [],   // 终态
  completed: [],   // 终态
}

// 兼容旧版本（向后兼容）
export const DeliveryOrderStatusFlow: Record<string, string[]> = ORDER_STATUS_FLOW as Record<string, string[]>

/**
 * 检查配送订单状态是否可以流转到目标状态
 * 阶段 2B-5：使用统一的状态流转白名单
 * 
 * @param currentStatus 当前状态
 * @param targetStatus 目标状态
 * @returns 是否可以流转
 */
export function canTransitionDeliveryOrderStatus(
  currentStatus: string,
  targetStatus: string
): boolean {
  // 标准化状态（转小写）
  const normalizedCurrent = currentStatus.toLowerCase() as DeliveryOrderStatus
  const normalizedTarget = targetStatus.toLowerCase() as DeliveryOrderStatus
  
  // 检查白名单
  const allowedTargets = ORDER_STATUS_FLOW[normalizedCurrent]
  if (!allowedTargets) {
    return false
  }
  
  return allowedTargets.includes(normalizedTarget)
}

/**
 * 获取订单状态的中文显示
 */
export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.PENDING_INSTALL]: "待安装",
    [OrderStatus.PENDING_ACCEPTANCE]: "待验收",
    [OrderStatus.ACTIVE]: "已激活",
    [OrderStatus.PROCESSING]: "待派单",
    [OrderStatus.DELIVERING]: "配送中",
    [OrderStatus.COMPLETED]: "已完成",
  }
  return labels[status] || status
}

/**
 * 获取产品类型的中文显示
 */
export function getProductTypeLabel(productType: ProductType): string {
  const labels: Record<ProductType, string> = {
    [ProductType.LPG]: "液化气",
    [ProductType.METHANOL]: "甲醇",
    [ProductType.CLEAN_FUEL]: "热能清洁燃料",
    [ProductType.OUTDOOR_FUEL]: "户外环保燃料",
  }
  return labels[productType] || productType
}

/**
 * 检查订单状态是否可以流转到目标状态
 */
export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  return OrderStatusFlow[currentStatus]?.includes(targetStatus) || false
}

