/**
 * Learning Record 实现
 * 写入 audit_logs，metadata 含 DecisionSample 结构
 */

import { writeAuditLog } from "@/lib/audit"
import type { DecisionSample } from "../models/decision-sample"

export interface LearningRecordInput {
  task_id: string
  worker_id: string
  outcome: string
  metrics?: Record<string, unknown>
  actor_id?: string | null
  task_snapshot?: Record<string, unknown>
  worker_snapshot?: Record<string, unknown>
  strategy_version?: string
  decision?: Record<string, unknown>
  /** 拒绝原因分类（平台语义，可归因） */
  rejected_category?: string | null
  /** 拒绝原因原文 */
  rejected_text?: string | null
}

export async function learningRecord(params: LearningRecordInput): Promise<{ success: boolean }> {
  const {
    task_id,
    worker_id,
    outcome,
    metrics,
    actor_id,
    task_snapshot,
    worker_snapshot,
    strategy_version,
    decision,
    rejected_category,
    rejected_text,
  } = params

  const sample: Partial<DecisionSample> = {
    sample_id: `smp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    task_snapshot: task_snapshot || {},
    worker_snapshot: worker_snapshot || {},
    strategy_version: strategy_version || "1.0.0",
    decision: decision || {},
    outcome,
    metrics: metrics as Record<string, number | string | boolean> | undefined,
    created_at: new Date().toISOString(),
  }

  try {
    await writeAuditLog({
      actor_id: actor_id || null,
      action: "PLATFORM_LEARNING_RECORD",
      target_type: "decision_sample",
      target_id: task_id,
      metadata: {
        worker_id,
        sample,
        rejected_category: rejected_category ?? undefined,
        rejected_text: rejected_text ?? undefined,
        platform: "platform-engine",
      },
    })
    return { success: true }
  } catch (err) {
    console.warn("[Platform Learning] 写入 audit_logs 失败:", err)
    return { success: false }
  }
}
