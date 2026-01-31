/**
 * 平台内核模型（Platform Core Models）
 * 平台不理解业务语义，只处理模型与能力
 * 业务表通过适配器映射到这些模型
 */

/** 任务模型：统一抽象 delivery/repair/rental 等任务 */
export interface TaskModel {
  id: string
  type: string
  status: string
  context: Record<string, unknown>
  constraints?: Record<string, unknown>
  created_at?: string
}

/** 工人模型：用于匹配与分配 */
export interface WorkerModel {
  id: string
  skills: string[]
  location?: { lat: number; lng: number }
  load?: number
  context?: Record<string, unknown>
}

/** 区域模型：用于再平衡 */
export interface RegionModel {
  id: string
  bounds?: unknown
  context?: Record<string, unknown>
}

/** 时间模型：用于调度窗口 */
export interface TimeModel {
  window_start?: string
  window_end?: string
  timezone?: string
}

/** 风险模型：占位 */
export interface RiskModel {
  level?: string
  factors?: unknown
}

/** 成本模型：占位 */
export interface CostModel {
  value?: number
  currency?: string
}

/** 绩效模型：占位 */
export interface PerformanceModel {
  metrics?: Record<string, number>
}

export type { DecisionSample } from "./decision-sample"
