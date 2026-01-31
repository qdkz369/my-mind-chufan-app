/**
 * Dispatch Allocate 实现
 * 将任务分配给指定工人，写回 assigned_to / worker_id
 * 决策追溯写入 audit_logs
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { writeAuditLog } from "@/lib/audit"

export interface DispatchAllocateInput {
  task_id: string
  worker_id: string
  company_id: string | null
  actor_id: string | null
  decision_trace?: Record<string, unknown>
  task_type?: "delivery" | "repair"
  supabase: SupabaseClient
}

export interface DispatchAllocateResult {
  success: boolean
  table?: string
  error?: string
}

export async function dispatchAllocate(
  params: DispatchAllocateInput
): Promise<DispatchAllocateResult> {
  const { task_id, worker_id, company_id, actor_id, decision_trace, task_type, supabase } =
    params

  // 0. 多租户：若有 company_id，验证工人属于该公司
  if (company_id) {
    const { data: worker } = await supabase
      .from("workers")
      .select("id, company_id")
      .eq("id", worker_id)
      .maybeSingle()
    if (!worker || (worker as any).company_id !== company_id) {
      return { success: false, error: "工人不属于当前公司" }
    }
  }

  // 1. 确定任务所在表并更新
  let table: string | null = null

  if (!task_type || task_type === "delivery") {
    const { data: deliveryRow, error: fetchErr } = await supabase
      .from("delivery_orders")
      .select("id, status, restaurant_id")
      .eq("id", task_id)
      .maybeSingle()

    if (!fetchErr && deliveryRow) {
      const { error: updateErr } = await supabase
        .from("delivery_orders")
        .update({
          status: "accepted",
          assigned_to: worker_id,
          worker_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task_id)

      if (!updateErr) {
        table = "delivery_orders"
      } else {
        return { success: false, error: updateErr.message }
      }
    }
  }

  if (!table && (!task_type || task_type === "repair")) {
    const { data: repairRow, error: fetchErr } = await supabase
      .from("repair_orders")
      .select("id, status, restaurant_id")
      .eq("id", task_id)
      .maybeSingle()

    if (!fetchErr && repairRow) {
      const { error: updateErr } = await supabase
        .from("repair_orders")
        .update({
          status: "assigned",
          assigned_to: worker_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task_id)

      if (!updateErr) {
        table = "repair_orders"
      } else {
        return { success: false, error: updateErr.message }
      }
    }
  }

  if (!table) {
    return { success: false, error: "任务不存在或类型不支持" }
  }

  // 2. 写入决策追溯到 audit_logs
  try {
    await writeAuditLog({
      actor_id: actor_id || null,
      action: "PLATFORM_DISPATCH_ALLOCATE",
      target_type: table,
      target_id: task_id,
      metadata: {
        worker_id,
        company_id,
        decision_trace: decision_trace || {},
        platform: "platform-engine",
      },
    })
  } catch (auditErr) {
    console.warn("[Platform Dispatch] 审计日志写入失败:", auditErr)
  }

  return { success: true, table }
}
