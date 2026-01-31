/**
 * Dispatch Match 实现
 * 输入 task_id，输出候选工人列表
 * 规则：按任务类型匹配工人技能（delivery->delivery, repair->repair），同公司、可用状态
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { MatchResult } from "../capabilities/dispatch"
import type { PrimaryReasonCode, SecondaryFactorCode } from "../types/recommendation"
import { deliveryOrderToTaskModel, repairOrderToTaskModel } from "../adapters/task.adapter"
import { workerToWorkerModel } from "../adapters/worker.adapter"

export interface DispatchMatchInput {
  task_id: string
  company_id: string | null
  task_type?: "delivery" | "repair"
  supabase: SupabaseClient
}

export async function dispatchMatch(params: DispatchMatchInput): Promise<MatchResult[]> {
  const { task_id, task_type, supabase } = params
  let company_id = params.company_id

  // 1. 解析任务：优先 delivery_orders，再 repair_orders
  let taskModel: { type: string; context: Record<string, unknown> } | null = null
  let resolvedType = task_type

  if (!resolvedType) {
    const { data: deliveryRow } = await supabase
      .from("delivery_orders")
      .select("id, restaurant_id, status, service_type, product_type")
      .eq("id", task_id)
      .maybeSingle()

    if (deliveryRow) {
      taskModel = deliveryOrderToTaskModel(deliveryRow as any)
      resolvedType = "delivery"
    }
  }

  if (!taskModel && !resolvedType) {
    const { data: repairRow } = await supabase
      .from("repair_orders")
      .select("id, restaurant_id, status, service_type")
      .eq("id", task_id)
      .maybeSingle()

    if (repairRow) {
      taskModel = repairOrderToTaskModel(repairRow as any)
      resolvedType = "repair"
    }
  }

  if (!taskModel && resolvedType) {
    if (resolvedType === "delivery") {
      const { data } = await supabase
        .from("delivery_orders")
        .select("id, restaurant_id, status, service_type, product_type")
        .eq("id", task_id)
        .maybeSingle()
      if (data) taskModel = deliveryOrderToTaskModel(data as any)
    } else if (resolvedType === "repair") {
      const { data } = await supabase
        .from("repair_orders")
        .select("id, restaurant_id, status, service_type")
        .eq("id", task_id)
        .maybeSingle()
      if (data) taskModel = repairOrderToTaskModel(data as any)
    }
  }

  if (!taskModel) {
    return []
  }

  const effectiveType = resolvedType || taskModel.type

  // 若无 company_id，从任务餐厅推导（super_admin 场景）
  if (!company_id && taskModel.context?.restaurant_id) {
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("company_id")
      .eq("id", taskModel.context.restaurant_id)
      .maybeSingle()
    company_id = (restaurant as any)?.company_id || null
  }
  if (!company_id) return []

  // 2. 查询可用工人：同公司、status 可用、技能匹配
  const statusFilter = ["active", "在线", "online"]
  let workersQuery = supabase
    .from("workers")
    .select("id, name, worker_type, product_types, status, company_id")
    .eq("company_id", company_id)

  const { data: workers, error } = await workersQuery

  if (error || !workers || workers.length === 0) {
    return []
  }

  // 3. 技能匹配：delivery 任务需要 delivery 技能，repair 需要 repair
  const requiredSkill = effectiveType === "delivery" ? "delivery" : "repair"
  const candidates: MatchResult[] = []

  for (const w of workers) {
    const status = (w.status || "").toLowerCase()
    if (!statusFilter.some((s) => status.includes(s))) continue

    const model = workerToWorkerModel(w as any)
    const hasSkill = model.skills.some(
      (s) => s.toLowerCase() === requiredSkill || s.toLowerCase().includes(requiredSkill)
    )
    if (!hasSkill) continue

    candidates.push({
      worker_id: w.id,
      score: 1,
      reason: `技能匹配: ${requiredSkill}`,
      primary_reason: "SKILL_MATCH" as PrimaryReasonCode,
      secondary_factors: ["AVAILABILITY"] as SecondaryFactorCode[],
    })
  }

  return candidates
}
