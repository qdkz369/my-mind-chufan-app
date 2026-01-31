/**
 * Platform Capability API: Learning Record
 * POST /api/platform/learning/record
 * 记录行为与结果（写入 audit_logs）
 */

import { NextResponse } from "next/server"
import { getUserContext } from "@/lib/auth/user-context"
import { learningRecord } from "@/lib/platform/impl/learning-record"

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
    const { task_id, worker_id, outcome, metrics } = body

    if (!task_id || !worker_id || !outcome) {
      return NextResponse.json(
        { success: false, error: "缺少 task_id、worker_id 或 outcome" },
        { status: 400 }
      )
    }

    const result = await learningRecord({
      task_id,
      worker_id,
      outcome,
      metrics,
      actor_id: userContext.userId,
    })

    return NextResponse.json({
      success: result.success,
    })
  } catch (err: any) {
    console.error("[Platform Learning Record] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
