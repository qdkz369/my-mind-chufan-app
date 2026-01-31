/**
 * StrategyCapability - 策略域能力接口
 * 策略是插件，平台只提供 evaluate/score/select 接口
 */

export interface WorkerScore {
  worker_id: string
  score: number
  factors?: Record<string, unknown>
}

export interface StrategyCapability {
  /** 评估：对任务+工人列表输出打分 */
  evaluate(params: {
    task_context: Record<string, unknown>
    workers_context: Record<string, unknown>[]
    model_version?: string
  }): Promise<WorkerScore[]>

  /** 对单个工人打分 */
  score(params: {
    task_context: Record<string, unknown>
    worker_context: Record<string, unknown>
  }): Promise<number>

  /** 根据打分和策略选出工人 */
  select(params: {
    scores: WorkerScore[]
    policy?: string
  }): Promise<{ worker_id: string } | null>
}
