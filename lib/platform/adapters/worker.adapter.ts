/**
 * 工人适配器：将 workers 表记录映射为 WorkerModel
 * 平台不理解业务语义，适配器负责转换
 */

import type { WorkerModel } from "../models"

/** workers 表原始结构 */
export interface WorkerRow {
  id: string
  name?: string
  phone?: string
  worker_type?: string | string[] | null
  product_types?: string | string[] | null
  status?: string
  company_id?: string | null
  [key: string]: unknown
}

function normalizeSkills(workerType: unknown, productTypes: unknown): string[] {
  const skills: string[] = []
  // worker_type: delivery, repair, install
  if (Array.isArray(workerType)) {
    skills.push(...workerType.filter((t): t is string => typeof t === "string"))
  } else if (typeof workerType === "string") {
    try {
      const parsed = JSON.parse(workerType)
      if (Array.isArray(parsed)) {
        skills.push(...parsed.filter((t: unknown): t is string => typeof t === "string"))
      } else if (["delivery", "repair", "install"].includes(workerType)) {
        skills.push(workerType)
      }
    } catch {
      if (["delivery", "repair", "install"].includes(workerType)) skills.push(workerType)
    }
  }
  // product_types: lpg, clean, alcohol, outdoor（仅配送员）
  if (Array.isArray(productTypes)) {
    skills.push(...productTypes.filter((t): t is string => typeof t === "string"))
  } else if (typeof productTypes === "string") {
    try {
      const parsed = JSON.parse(productTypes)
      if (Array.isArray(parsed)) {
        skills.push(...parsed.filter((t: unknown): t is string => typeof t === "string"))
      }
    } catch {
      if (productTypes) skills.push(productTypes)
    }
  }
  return [...new Set(skills)]
}

/**
 * 将工人记录转换为 WorkerModel
 */
export function workerToWorkerModel(row: WorkerRow): WorkerModel {
  const skills = normalizeSkills(row.worker_type, row.product_types)
  return {
    id: row.id,
    skills,
    load: 0, // 占位，后续可从订单数计算
    context: {
      name: row.name,
      status: row.status,
      company_id: row.company_id,
    },
  }
}
