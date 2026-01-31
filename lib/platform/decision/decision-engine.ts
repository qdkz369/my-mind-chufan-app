/**
 * Decision Engine - 决策引擎
 * 平台中枢：统一决策入口，可编排、可追溯、可插拔
 * 决策路径可复用，多策略可组合，A/B 实验有宿主
 */

import type { DecisionContext } from "./decision-context"
import type { DecisionTrace } from "./decision-trace"

export interface StrategyResult {
  worker_id?: string
  scores?: Array<{ worker_id: string; score: number }>
  candidates?: Array<{ worker_id: string; score?: number }>
  [key: string]: unknown
}

export interface DecisionOutput {
  success: boolean
  result?: StrategyResult
  trace: DecisionTrace
  error?: string
}

export type StrategyApplicator = (
  ctx: DecisionContext
) => Promise<StrategyResult> | StrategyResult

export interface DecisionEngineConfig {
  strategy_version?: string
  strategies?: StrategyApplicator[]
  onEmitTrace?: (trace: DecisionTrace) => void | Promise<void>
}

/**
 * Decision Engine
 */
export class DecisionEngine {
  private config: DecisionEngineConfig

  constructor(config: DecisionEngineConfig = {}) {
    this.config = {
      strategies: [],
      ...config,
    }
  }

  /** 1. 接收输入 */
  input(ctx: DecisionContext): DecisionContext {
    return ctx
  }

  /** 2. 应用策略链 */
  async applyStrategies(ctx: DecisionContext): Promise<StrategyResult | null> {
    const strategies = this.config.strategies || []
    let lastResult: StrategyResult | null = null

    for (const apply of strategies) {
      lastResult = await Promise.resolve(apply(ctx))
      if (lastResult && lastResult.worker_id) break
    }

    return lastResult
  }

  /** 3. 冲突解决（占位） */
  resolveConflicts(
    _ctx: DecisionContext,
    _result: StrategyResult | null
  ): StrategyResult | null {
    return _result
  }

  /** 4. 产出决策 */
  async produceDecision(ctx: DecisionContext): Promise<DecisionOutput> {
    const decisionId = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const trace: DecisionTrace = {
      decision_id: decisionId,
      request_id: ctx.request_id,
      decision_type: "match",
      strategy_version: ctx.strategy_version || this.config.strategy_version,
      input_summary: {
        task_id: ctx.task.id,
        workers_count: ctx.workers.length,
      },
      decision_output: {},
      timestamp: new Date().toISOString(),
    }

    try {
      const result = await this.applyStrategies(ctx)
      const resolved = this.resolveConflicts(ctx, result)

      if (resolved) {
        trace.strategy_output = resolved as unknown as Record<string, unknown>
        trace.decision_output = {
          worker_id: resolved.worker_id,
          candidates: resolved.candidates,
          scores: resolved.scores,
        }
      }

      await this.emitDecisionTrace(trace)

      return {
        success: !!resolved,
        result: resolved || undefined,
        trace,
      }
    } catch (err: unknown) {
      trace.decision_output = { error: (err as Error).message }
      await this.emitDecisionTrace(trace)
      return {
        success: false,
        trace,
        error: (err as Error).message,
      }
    }
  }

  /** 5. 发出决策追溯 */
  async emitDecisionTrace(trace: DecisionTrace): Promise<void> {
    if (this.config.onEmitTrace) {
      await Promise.resolve(this.config.onEmitTrace(trace))
    }
  }

  /** 便捷方法：一次性执行完整决策流程 */
  async decide(ctx: DecisionContext): Promise<DecisionOutput> {
    const inputCtx = this.input(ctx)
    return this.produceDecision(inputCtx)
  }
}
