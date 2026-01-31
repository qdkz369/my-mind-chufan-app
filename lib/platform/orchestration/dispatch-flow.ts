/**
 * Dispatch Flow - 调度编排流程
 * 事件 → Match → (可选 Strategy) → Allocate → Learning Record
 */

import type { OrchestrationEvent, OrchestrationState } from "./orchestration-engine"
import { defaultRegistry } from "../registry"
import { writeAuditLog } from "@/lib/audit"

export function createDispatchFlow(
  getSupabase: () => { from: (t: string) => any },
  getCompanyId: () => string | null,
  getActorId: () => string | null
) {
  return [
    async (event: OrchestrationEvent, state: OrchestrationState): Promise<OrchestrationState> => {
      const { task_id, task_type } = (event.payload || {}) as Record<string, unknown>
      if (!task_id) {
        return { ...state, error: "missing task_id", step: "match" }
      }

      const resolved = defaultRegistry.resolve("dispatch.match", {
        version: "1.0.0",
        tenant: getCompanyId() || undefined,
      })
      if (!resolved) {
        return { ...state, error: "dispatch.match not registered", step: "match" }
      }

      const supabase = getSupabase()
      const candidates = await (resolved.handler as any)({
        task_id,
        company_id: getCompanyId(),
        task_type,
        supabase,
      })

      return {
        ...state,
        step: "match",
        data: { ...state.data, candidates, task_id },
      }
    },
    async (event: OrchestrationEvent, state: OrchestrationState): Promise<OrchestrationState> => {
      const { worker_id } = (event.payload || {}) as Record<string, unknown>
      const task_id = state.data?.task_id as string
      if (!worker_id || !task_id) {
        return { ...state, error: "missing worker_id or task_id", step: "allocate" }
      }

      const resolved = defaultRegistry.resolve("dispatch.allocate", {
        version: "1.0.0",
        tenant: getCompanyId() || undefined,
      })
      if (!resolved) {
        return { ...state, error: "dispatch.allocate not registered", step: "allocate" }
      }

      const supabase = getSupabase()
      const result = await (resolved.handler as any)({
        task_id,
        worker_id,
        company_id: getCompanyId(),
        actor_id: getActorId(),
        decision_trace: state.data,
        supabase,
      })

      if (!result.success) {
        return { ...state, error: result.error, step: "allocate" }
      }

      try {
        await writeAuditLog({
          actor_id: getActorId(),
          action: "PLATFORM_ORCHESTRATION_DISPATCH",
          target_type: "orchestration",
          target_id: state.event_id,
          metadata: { task_id, worker_id, step: "allocate" },
        })
      } catch (_) {}

      return {
        ...state,
        step: "allocate",
        data: { ...state.data, allocated: true, worker_id },
      }
    },
  ]
}
