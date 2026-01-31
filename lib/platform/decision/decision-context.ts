/**
 * Decision Context - 决策输入上下文
 * 决策引擎的输入：模型快照 + 运行时上下文
 */

import type { TaskModel, WorkerModel } from "../models"

export interface DecisionContext {
  /** 决策请求 ID，用于追溯 */
  request_id: string

  /** 任务模型快照（冻结） */
  task: TaskModel

  /** 候选工人模型快照 */
  workers: WorkerModel[]

  /** 策略版本 */
  strategy_version?: string

  /** 租户/公司范围 */
  tenant_id?: string

  /** 区域范围 */
  region_id?: string

  /** 约束条件 */
  constraints?: Record<string, unknown>

  /** 扩展元数据 */
  meta?: Record<string, unknown>
}
