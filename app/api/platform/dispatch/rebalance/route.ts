/**
 * Platform Capability API: Dispatch Rebalance
 * POST /api/platform/dispatch/rebalance
 * 再平衡：区域维度重新分配（当前为占位实现）
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
    const { region_id, trigger, strategy_id } = body

    if (!region_id || !trigger) {
      return NextResponse.json(
        { success: false, error: "缺少 region_id 或 trigger" },
        { status: 400 }
      )
    }

    // 占位实现
    return NextResponse.json({
      success: true,
      data: { rebalanced_count: 0, _placeholder: true },
    })
  } catch (err: any) {
    console.error("[Platform Dispatch Rebalance] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
