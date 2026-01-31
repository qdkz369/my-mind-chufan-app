/**
 * Platform Capability API: Strategy Evaluate
 * POST /api/platform/strategy/evaluate
 * 策略评估：对任务+工人列表输出打分
 */

import { NextResponse } from "next/server"
import { getUserContext } from "@/lib/auth/user-context"
import { strategyEvaluate } from "@/lib/platform/impl/strategy-evaluate"

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
    const { task_context = {}, workers_context = [], model_version } = body

    const scores = strategyEvaluate({
      task_context,
      workers_context,
      model_version,
    })

    return NextResponse.json({
      success: true,
      data: { scores },
    })
  } catch (err: any) {
    console.error("[Platform Strategy Evaluate] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
