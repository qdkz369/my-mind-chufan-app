/**
 * FeedbackCapability - 反馈域能力接口
 * 触发器采集 → 结果写回 → 指标沉淀 → 策略回路
 */

export interface FeedbackCapability {
  /** 采集原始事件 */
  collect(params: {
    trigger?: string
    time_range?: { start: string; end: string }
  }): Promise<{ events: unknown[] }>

  /** 聚合成指标 */
  aggregate(params: {
    events: unknown[]
    aggregation_type?: string
  }): Promise<{ metrics: Record<string, unknown> }>

  /** 反馈回路：将指标反馈给策略/学习 */
  feedbackLoop(params: {
    metrics: Record<string, unknown>
    target?: string
  }): Promise<{ success: boolean }>
}
