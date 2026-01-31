/**
 * Platform Capability API: Task Update
 * POST /api/platform/task/update
 * 更新任务状态（当前为占位实现）
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
    const { task_id, from_status, to_status, metadata } = body

    if (!task_id || !from_status || !to_status) {
      return NextResponse.json(
        { success: false, error: "缺少 task_id、from_status 或 to_status" },
        { status: 400 }
      )
    }

    // 占位实现
    return NextResponse.json({
      success: true,
      data: { success: true },
      _placeholder: true,
    })
  } catch (err: any) {
    console.error("[Platform Task Update] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
