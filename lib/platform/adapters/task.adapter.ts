/**
 * 任务适配器：将业务表记录映射为 TaskModel
 * 平台不理解业务语义，适配器负责转换
 */

import type { TaskModel } from "../models"

export type TaskSource = "delivery" | "repair" | "rental"

/** 配送订单原始结构 */
export interface DeliveryOrderRow {
  id: string
  restaurant_id?: string
  status?: string
  worker_id?: string | null
  assigned_to?: string | null
  service_type?: string
  product_type?: string
  created_at?: string
  [key: string]: unknown
}

/** 报修工单原始结构 */
export interface RepairOrderRow {
  id: string
  restaurant_id?: string
  status?: string
  assigned_to?: string | null
  service_type?: string
  created_at?: string
  [key: string]: unknown
}

/** 租赁订单原始结构 */
export interface RentalOrderRow {
  id: string
  restaurant_id?: string
  status?: string
  provider_id?: string | null
  created_at?: string
  [key: string]: unknown
}

/**
 * 将配送订单转换为 TaskModel
 */
export function deliveryOrderToTaskModel(row: DeliveryOrderRow): TaskModel {
  return {
    id: row.id,
    type: "delivery",
    status: (row.status || "pending").toLowerCase(),
    context: {
      restaurant_id: row.restaurant_id,
      worker_id: row.worker_id,
      assigned_to: row.assigned_to,
      service_type: row.service_type,
      product_type: row.product_type,
    },
    created_at: row.created_at,
  }
}

/**
 * 将报修工单转换为 TaskModel
 */
export function repairOrderToTaskModel(row: RepairOrderRow): TaskModel {
  return {
    id: row.id,
    type: "repair",
    status: (row.status || "pending").toLowerCase(),
    context: {
      restaurant_id: row.restaurant_id,
      assigned_to: row.assigned_to,
      service_type: row.service_type,
    },
    created_at: row.created_at,
  }
}

/**
 * 将租赁订单转换为 TaskModel
 */
export function rentalOrderToTaskModel(row: RentalOrderRow): TaskModel {
  return {
    id: row.id,
    type: "rental",
    status: (row.status || "active").toLowerCase(),
    context: {
      restaurant_id: row.restaurant_id,
      provider_id: row.provider_id,
    },
    created_at: row.created_at,
  }
}

/**
 * 根据 task_id 前缀或 type 判断任务来源类型
 */
export function inferTaskSource(taskId: string, type?: string): TaskSource {
  if (type) {
    if (["delivery", "repair", "rental"].includes(type)) return type as TaskSource
  }
  return "delivery" // 默认
}
