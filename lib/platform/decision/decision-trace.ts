/**
 * Decision Trace - 决策追溯
 * 完整记录决策路径，支持 Learning 与审计
 */

export interface DecisionTrace {
  /** 决策 ID */
  decision_id: string

  /** 请求 ID */
  request_id: string

  /** 决策类型：match | allocate | select */
  decision_type: string

  /** 策略版本 */
  strategy_version?: string

  /** 输入摘要 */
  input_summary?: Record<string, unknown>

  /** 策略评估结果（scores 等） */
  strategy_output?: Record<string, unknown>

  /** 冲突及解决方式 */
  conflicts?: Array<{ type: string; resolution: string }>

  /** 最终决策输出 */
  decision_output: Record<string, unknown>

  /** 时间戳 */
  timestamp: string

  /** 扩展 */
  meta?: Record<string, unknown>
}
