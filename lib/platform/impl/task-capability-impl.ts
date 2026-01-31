/**
 * Task Capability 实现
 * freezeContext / snapshot / mutateWithDecision
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import {
  deliveryOrderToTaskModel,
  repairOrderToTaskModel,
} from "../adapters/task.adapter"
import { dispatchAllocate } from "./dispatch-allocate"

export async function taskFreezeContext(
  params: { task_id: string; supabase: SupabaseClient }
): Promise<{ snapshot: Record<string, unknown> } | null> {
  const { task_id, supabase } = params
  const snapshot = await taskSnapshot(params)
  return snapshot ? { snapshot } : null
}

export async function taskSnapshot(
  params: { task_id: string; supabase: SupabaseClient }
): Promise<Record<string, unknown> | null> {
  const { task_id, supabase } = params

  const { data: d } = await supabase
    .from("delivery_orders")
    .select("id, restaurant_id, status, worker_id, assigned_to, service_type, product_type, created_at")
    .eq("id", task_id)
    .maybeSingle()
  if (d) return deliveryOrderToTaskModel(d as any) as unknown as Record<string, unknown>

  const { data: r } = await supabase
    .from("repair_orders")
    .select("id, restaurant_id, status, assigned_to, service_type, created_at")
    .eq("id", task_id)
    .maybeSingle()
  if (r) return repairOrderToTaskModel(r as any) as unknown as Record<string, unknown>

  return null
}

export async function taskMutateWithDecision(
  params: {
    task_id: string
    decision: Record<string, unknown>
    trace_id?: string
    company_id: string | null
    actor_id: string | null
    supabase: SupabaseClient
  }
): Promise<{ success: boolean }> {
  const { task_id, decision, company_id, actor_id, supabase } = params
  const worker_id = decision.worker_id as string
  if (!worker_id) return { success: false }

  const result = await dispatchAllocate({
    task_id,
    worker_id,
    company_id,
    actor_id,
    decision_trace: { trace_id: params.trace_id, ...decision },
    supabase,
  })
  return { success: result.success }
}
