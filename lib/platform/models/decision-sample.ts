/**
 * DecisionSample - 可训练决策样本
 * Learning Engine 数据结构：支持后续训练、特征工程
 */

export interface DecisionSample {
  /** 样本 ID */
  sample_id: string

  /** 任务快照（决策时冻结） */
  task_snapshot: Record<string, unknown>

  /** 工人快照（决策时冻结） */
  worker_snapshot: Record<string, unknown>

  /** 策略版本 */
  strategy_version: string

  /** 决策输出 */
  decision: {
    worker_id?: string
    scores?: Array<{ worker_id: string; score: number }>
    [key: string]: unknown
  }

  /** 结果：success | failure | exception */
  outcome: string

  /** 指标 */
  metrics?: Record<string, number | string | boolean>

  /** 决策上下文摘要 */
  context_summary?: Record<string, unknown>

  /** 时间戳 */
  created_at: string

  /** 扩展 */
  meta?: Record<string, unknown>
}
