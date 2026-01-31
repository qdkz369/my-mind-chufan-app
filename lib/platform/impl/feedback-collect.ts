/**
 * Feedback Collect 占位实现
 * 从 audit_logs 聚合，输出基础指标
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export interface FeedbackCollectInput {
  trigger?: string
  time_range?: { start: string; end: string }
  supabase: SupabaseClient
}

export async function feedbackCollect(
  params: FeedbackCollectInput
): Promise<{ events: unknown[] }> {
  const { time_range, supabase } = params
  const start = time_range?.start || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const end = time_range?.end || new Date().toISOString()

  const { data: events, error } = await supabase
    .from("audit_logs")
    .select("id, action, target_type, target_id, metadata, created_at")
    .gte("created_at", start)
    .lte("created_at", end)
    .in("action", ["PLATFORM_DISPATCH_ALLOCATE", "PLATFORM_LEARNING_RECORD", "ORDER_ACCEPTED", "ORDER_COMPLETED"])
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.warn("[Platform Feedback] 查询 audit_logs 失败:", error)
    return { events: [] }
  }
  return { events: events || [] }
}
