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

