/**
 * GET /api/platform/dispatch/replay?task_id=xxx
 * 回放指定任务的派单决策过程（Phase A 验收：DecisionTrace 可回放）
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

export async function GET(request: Request) {
  try {
    const userContext = await getUserContext(request as any)
    if (!userContext) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("task_id")
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "缺少 task_id" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "服务器配置错误" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("id, action, target_type, target_id, metadata, created_at")
      .or(`action.eq.PLATFORM_DECISION_TRACE,action.eq.PLATFORM_LEARNING_RECORD,action.eq.PLATFORM_DISPATCH_ALLOCATE,action.eq.ORDER_DISPATCHED,action.eq.ORDER_ACCEPTED`)
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json(
        { success: false, error: "查询失败", details: error.message },
        { status: 500 }
      )
    }

    const relevant = (logs || []).filter((log) => {
      const meta = (log.metadata || {}) as Record<string, unknown>
      return meta?.task_id === taskId || log.target_id === taskId
    })

    const decisionTrace = relevant.find((l) => l.action === "PLATFORM_DECISION_TRACE")
    const learningRecord = relevant.find((l) => l.action === "PLATFORM_LEARNING_RECORD")

    return NextResponse.json({
      success: true,
      data: {
        task_id: taskId,
        decision_trace: decisionTrace?.metadata ?? null,
        learning_record: learningRecord?.metadata ?? null,
        all_related: relevant.map((l) => ({
          action: l.action,
          created_at: l.created_at,
          metadata: l.metadata,
        })),
      },
    })
  } catch (err: unknown) {
    console.error("[Platform Replay] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: (err as Error).message },
      { status: 500 }
    )
  }
}
