/**
 * DispatchCapability - 调度域能力接口
 * 平台不暴露分配逻辑细节，只暴露 match/allocate/rebalance
 */

import type { TaskModel, WorkerModel } from "../models"
import type { PrimaryReasonCode, SecondaryFactorCode } from "../types/recommendation"

export interface MatchResult {
  worker_id: string
  score?: number
  reason?: string
  /** 结构化推荐（平台语义） */
  primary_reason?: PrimaryReasonCode
  secondary_factors?: SecondaryFactorCode[]
}

export interface DispatchCapability {
  /** 匹配工人：输入任务与约束，输出候选工人列表 */
  matchWorker(params: {
    task_id: string
    strategy_id?: string
    constraints?: Record<string, unknown>
    context?: Record<string, unknown>
  }): Promise<MatchResult[]>

  /** 分配任务：将任务分配给指定工人 */
  allocateTask(params: {
    task_id: string
    worker_id: string
    decision_trace?: Record<string, unknown>
  }): Promise<{ success: boolean }>

  /** 再平衡：区域维度重新分配 */
  rebalance(params: {
    region_id: string
    trigger: string
    strategy_id?: string
  }): Promise<{ success: boolean; rebalanced_count?: number }>
}
