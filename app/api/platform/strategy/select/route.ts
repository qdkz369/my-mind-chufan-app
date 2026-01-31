/**
 * Platform Capability API: Strategy Select
 * POST /api/platform/strategy/select
 * 策略选择：根据打分和策略选出工人（当前为占位实现）
 */

import { NextResponse } from "next/server"
import { getUserContext } from "@/lib/auth/user-context"

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
    const { scores, policy } = body

    // 占位实现：无打分时返回 null
    const top = Array.isArray(scores) && scores.length > 0
      ? scores.reduce((a: any, b: any) => (a.score >= b.score ? a : b))
      : null

    return NextResponse.json({
      success: true,
      data: top ? { worker_id: top.worker_id } : null,
      _placeholder: true,
    })
  } catch (err: any) {
    console.error("[Platform Strategy Select] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
