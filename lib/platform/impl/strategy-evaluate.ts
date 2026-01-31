/**
 * Strategy Evaluate 占位实现
 * 输入 task_context + workers_context，输出 scores
 * 当前为固定规则：所有工人均分 1，含结构化 factors
 */

import type { WorkerScore } from "../capabilities/strategy"
import type { PrimaryReasonCode, SecondaryFactorCode } from "../types/recommendation"

export interface StrategyEvaluateInput {
  task_context: Record<string, unknown>
  workers_context: Record<string, unknown>[]
  model_version?: string
}

export function strategyEvaluate(params: StrategyEvaluateInput): WorkerScore[] {
  const { workers_context } = params
  if (!Array.isArray(workers_context) || workers_context.length === 0) {
    return []
  }
  return workers_context
    .filter((w: any) => w?.id || w?.worker_id)
    .map((w: any) => ({
      worker_id: w.id || w.worker_id,
      score: 1,
      factors: {
        primary_reason: "SKILL_MATCH" as PrimaryReasonCode,
        secondary_factors: ["AVAILABILITY"] as SecondaryFactorCode[],
        confidence_score: 0.8,
      },
    }))
}
