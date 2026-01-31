/**
 * Platform Capability API: Feedback Aggregate
 * POST /api/platform/feedback/aggregate
 * 聚合成指标（当前为占位实现）
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
    const { events, aggregation_type } = body

    // 占位实现
    return NextResponse.json({
      success: true,
      data: { metrics: {} },
      _placeholder: true,
    })
  } catch (err: any) {
    console.error("[Platform Feedback Aggregate] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
