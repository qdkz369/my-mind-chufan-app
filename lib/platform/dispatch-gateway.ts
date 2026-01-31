/**
 * Dispatch Gateway - 调度决策网关
 *
 * 平台接管中枢：业务 API 必须经此获取/记录决策，不可旁路。
 * Phase A (Shadow): 平台算决策并记录，业务仍用自传 worker 执行
 * Phase C (Enforced): 仅平台决策可执行
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/audit"
import { dispatchMatch } from "./impl/dispatch-match"
import { strategyEvaluate } from "./impl/strategy-evaluate"
import { learningRecord } from "./impl/learning-record"
import type { PlatformRecommendation } from "./types/recommendation"
import { formatRecommendationForUI } from "./types/recommendation"
import type { RejectReasonCategory } from "./types/reject-reason"

export type TakeoverMode = "shadow" | "suggest" | "enforced"

export interface DispatchGatewayInput {
  task_id: string
  task_type: "delivery" | "repair"
  company_id: string | null
  actor_id: string | null
  business_provided_worker_id?: string | null
  /** Phase B: 业务拒绝平台建议时必填 */
  rejected_reason?: string | null
  /** 拒绝原因分类（平台语义，可归因） */
  rejected_category?: RejectReasonCategory | string | null
  supabase: SupabaseClient
}

export interface DispatchGatewayOutput {
  success: boolean
  decision_id: string
  platform_selected_worker: string | null
  /** 结构化推荐（平台消费） */
  platform_recommendation?: PlatformRecommendation
  /** 人类可读理由（UI 展示） */
  platform_recommendation_reason?: string
  candidates: Array<{ worker_id: string; score: number; reason?: string }>
  trace: Record<string, unknown>
  business_override: boolean
  error?: string
}

/** 从环境变量读取接管模式，默认 shadow */
function getTakeoverMode(): TakeoverMode {
  const m = (process.env.PLATFORM_DISPATCH_TAKEOVER_MODE || "shadow").toLowerCase()
  if (m === "suggest" || m === "enforced") return m
  return "shadow"
}

/**
 * 执行调度决策（match → evaluate → 选人），并写入 DecisionTrace、DecisionSample
 */
export async function dispatchViaPlatform(
  input: DispatchGatewayInput
): Promise<DispatchGatewayOutput> {
  const {
    task_id,
    task_type,
    company_id,
    actor_id,
    business_provided_worker_id,
    rejected_reason,
    rejected_category,
    supabase,
  } = input

  const decision_id = `dec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  try {
    // 1. Match: 获取候选工人
    const candidates = await dispatchMatch({
      task_id,
      company_id,
      task_type,
      supabase,
    })

    if (!candidates || candidates.length === 0) {
      const trace = {
        decision_id,
        decision_type: "dispatch",
        strategy_version: "1.0.0",
        input_summary: { task_id, task_type },
        decision_output: { error: "no_candidates" },
        timestamp: new Date().toISOString(),
      }
      await writeDecisionTrace(supabase, task_id, decision_id, trace, actor_id)
      return {
        success: false,
        decision_id,
        platform_selected_worker: null,
        candidates: [],
        trace: trace as Record<string, unknown>,
        business_override: !!business_provided_worker_id,
        error: "无可用候选工人",
      }
    }

    // 2. Evaluate: 打分（当前占位为均分 1）
    const workersContext = candidates.map((c) => ({
      id: c.worker_id,
      worker_id: c.worker_id,
    }))
    const scores = strategyEvaluate({
      task_context: { task_id, task_type },
      workers_context: workersContext,
      model_version: "1.0.0",
    })

    // 3. 选择得分最高的工人（同分取第一个）
    const sorted = [...scores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const platform_selected_worker =
      sorted.length > 0 ? sorted[0].worker_id : candidates[0]?.worker_id ?? null

    const candidatesWithScores = candidates.map((c) => {
      const s = scores.find((x) => x.worker_id === c.worker_id)
      const factors = (s as any)?.factors
      return {
        worker_id: c.worker_id,
        score: s?.score ?? c.score ?? 1,
        reason: c.reason,
        primary_reason: c.primary_reason ?? factors?.primary_reason ?? "SKILL_MATCH",
        secondary_factors: c.secondary_factors ?? factors?.secondary_factors ?? ["AVAILABILITY"],
        confidence_score: factors?.confidence_score ?? 0.8,
      }
    })

    const business_override =
      !!business_provided_worker_id &&
      business_provided_worker_id !== platform_selected_worker

    const topCandidate = candidatesWithScores[0]
    const platform_recommendation: PlatformRecommendation = {
      primary_reason: topCandidate?.primary_reason ?? "SKILL_MATCH",
      secondary_factors: topCandidate?.secondary_factors ?? ["AVAILABILITY"],
      confidence_score: topCandidate?.confidence_score ?? 0.8,
    }
    const platform_recommendation_reason = formatRecommendationForUI(platform_recommendation)

    if (getTakeoverMode() === "suggest" && business_override && !rejected_category?.trim()) {
      return {
        success: false,
        decision_id,
        platform_selected_worker,
        platform_recommendation,
        platform_recommendation_reason,
        candidates: candidatesWithScores,
        trace: {} as Record<string, unknown>,
        business_override: true,
        error: "REJECTED_REASON_REQUIRED",
      }
    }

    const trace = {
      decision_id,
      decision_type: "dispatch",
      strategy_version: "1.0.0",
      input_summary: { task_id, task_type, candidates_count: candidates.length },
      strategy_output: { scores: candidatesWithScores },
      decision_output: {
        platform_recommendation,
        platform_selected_worker,
        business_provided_worker_id: business_provided_worker_id ?? null,
        business_override,
        rejected_reason: business_override ? rejected_reason ?? null : null,
        rejected_category: business_override ? rejected_category ?? null : null,
        candidates: candidatesWithScores,
      },
      timestamp: new Date().toISOString(),
    }

    // 4. 写入 DecisionTrace
    await writeDecisionTrace(supabase, task_id, decision_id, trace, actor_id)

    // 5. 写入 DecisionSample (Learning)
    const effectiveWorker =
      getTakeoverMode() === "enforced"
        ? platform_selected_worker
        : business_provided_worker_id ?? platform_selected_worker

    if (effectiveWorker) {
      await learningRecord({
        task_id,
        worker_id: effectiveWorker,
        outcome: business_override ? "business_override" : "platform_accepted",
        actor_id,
        task_snapshot: { task_id, task_type },
        worker_snapshot: { worker_id: effectiveWorker },
        strategy_version: "1.0.0",
        decision: trace.decision_output as Record<string, unknown>,
        rejected_category: business_override ? (rejected_category ?? undefined) : undefined,
        rejected_text: business_override ? (rejected_reason ?? undefined) : undefined,
        metrics: {
          business_override,
          candidates_count: candidates.length,
          rejected_reason: business_override ? rejected_reason ?? undefined : undefined,
          rejected_category: business_override ? rejected_category ?? undefined : undefined,
        },
      })
    }

    return {
      success: true,
      decision_id,
      platform_selected_worker,
      platform_recommendation,
      platform_recommendation_reason,
      candidates: candidatesWithScores,
      trace: trace as Record<string, unknown>,
      business_override,
    }
  } catch (err: unknown) {
    const trace = {
      decision_id,
      decision_type: "dispatch",
      decision_output: { error: (err as Error).message },
      timestamp: new Date().toISOString(),
    }
    await writeDecisionTrace(supabase, task_id, decision_id, trace, actor_id)

    await writeAuditLog({
      actor_id,
      action: "PLATFORM_BYPASS_ATTEMPT",
      target_type: "dispatch_gateway",
      target_id: task_id,
      metadata: {
        error: (err as Error).message,
        decision_id,
        task_type,
      },
    })

    return {
      success: false,
      decision_id,
      platform_selected_worker: null,
      candidates: [],
      trace: trace as Record<string, unknown>,
      business_override: !!business_provided_worker_id,
      error: (err as Error).message,
    }
  }
}

async function writeDecisionTrace(
  supabase: SupabaseClient,
  task_id: string,
  decision_id: string,
  trace: Record<string, unknown>,
  actor_id: string | null
): Promise<void> {
  try {
    await writeAuditLog({
      actor_id,
      action: "PLATFORM_DECISION_TRACE",
      target_type: "decision",
      target_id: decision_id,
      metadata: {
        task_id,
        trace,
        platform: "platform-engine",
      },
    })
  } catch (e) {
    console.warn("[Dispatch Gateway] 写入 DecisionTrace 失败:", e)
  }
}
