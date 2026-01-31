/**
 * LearningCapability - 学习域能力接口
 * AI 是外挂引擎，平台只提供 record/train/updateWeights
 */

export interface LearningCapability {
  /** 记录行为与结果 */
  record(params: {
    task_id: string
    worker_id: string
    outcome: string
    metrics?: Record<string, unknown>
  }): Promise<{ success: boolean }>

  /** 训练/更新模型 */
  train(params: {
    dataset_range?: { start: string; end: string }
    model_type?: string
  }): Promise<{ success: boolean; model_version?: string }>

  /** 更新策略权重 */
  updateWeights(params: {
    strategy_id: string
    weights: Record<string, number>
  }): Promise<{ success: boolean }>
}
