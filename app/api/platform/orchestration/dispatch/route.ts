/**
 * Platform Orchestration API: Dispatch Flow
 * POST /api/platform/orchestration/dispatch
 * 通过编排引擎执行调度流程：match → allocate
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { OrchestrationEngine } from "@/lib/platform/orchestration"
import { createDispatchFlow } from "@/lib/platform/orchestration/dispatch-flow"

export async function POST(request: Request) {
  try {
    const userContext = await getUserContext(request as any)
    if (!userContext) {
      return NextResponse.json(
        { success: false, error: "未授权", details: "请先登录" },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { task_id, worker_id, task_type } = body

    if (!task_id || !worker_id) {
      return NextResponse.json(
        { success: false, error: "缺少 task_id 或 worker_id" },
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

    const companyId =
      userContext.role !== "super_admin" ? userContext.companyId : null

    const flow = createDispatchFlow(
      () => supabase,
      () => companyId,
      () => userContext.userId
    )

    const engine = new OrchestrationEngine({ timeout_ms: 15000 })
    engine.registerFlow("dispatch", flow)

    const state = await engine.onEvent("dispatch", {
      type: "allocate",
      payload: { task_id, worker_id, task_type },
    })

    if (state.error) {
      return NextResponse.json(
        { success: false, error: state.error, state },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: state.data,
    })
  } catch (err: any) {
    console.error("[Platform Orchestration] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
