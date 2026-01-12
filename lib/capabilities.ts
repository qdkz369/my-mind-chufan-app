/**
 * Capability（能力）定义
 * 阶段 2B-4：权限与审计正式收口
 * 阶段 2B-5：新增订单异常处理能力占位（不强制）
 * 
 * 核心原则：所有权限判断统一走 Capability，不再在 API 内直接判断 role
 */

export enum Capability {
  // 订单相关能力
  ORDER_ACCEPT = 'order.accept',
  ORDER_DISPATCH = 'order.dispatch',
  ORDER_COMPLETE = 'order.complete',
  
  // 阶段 2B-5：新增订单异常处理能力（占位，不强制）
  CAP_ORDER_REJECT = 'order.reject',
  CAP_ORDER_EXCEPTION = 'order.exception',
}

// 兼容旧命名（向后兼容）
export const CAP_ORDER_REJECT = Capability.CAP_ORDER_REJECT
export const CAP_ORDER_EXCEPTION = Capability.CAP_ORDER_EXCEPTION
