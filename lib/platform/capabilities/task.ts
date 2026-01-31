/**
 * TaskCapability - 任务域能力接口
 * 平台不暴露表结构，只暴露能力
 * 含平台级扩展：freezeContext / snapshot / mutateWithDecision
 */

import type { TaskModel } from "../models"

export interface TaskCapability {
  /** 创建任务 */
  createTask(params: { context: Record<string, unknown>; type?: string }): Promise<{ task_id: string }>

  /** 更新任务状态 */
  updateTaskStatus(params: {
    task_id: string
    from_status: string
    to_status: string
    metadata?: Record<string, unknown>
  }): Promise<{ success: boolean }>

  /** 获取任务上下文 */
  getTaskContext(params: { task_id: string }): Promise<TaskModel | null>

  /** 冻结决策输入：用于 Learning 可复现 */
  freezeContext(params: { task_id: string }): Promise<{ snapshot: TaskModel } | null>

  /** 快照：用于 DecisionSample */
  snapshot(params: { task_id: string }): Promise<Record<string, unknown> | null>

  /** 统一决策写入：由 Decision 产出驱动状态变更 */
  mutateWithDecision(params: {
    task_id: string
    decision: Record<string, unknown>
    trace_id?: string
  }): Promise<{ success: boolean }>
}
