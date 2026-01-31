/**
 * Platform Capability API: Task Context
 * GET /api/platform/task/context?task_id=xxx
 * 获取任务上下文（当前为占位实现）
 */

import { NextResponse } from "next/server"
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
    const task_id = searchParams.get("task_id")

    if (!task_id) {
      return NextResponse.json(
        { success: false, error: "缺少 task_id" },
        { status: 400 }
      )
    }

    // 占位实现
    return NextResponse.json({
      success: true,
      data: null,
      _placeholder: true,
    })
  } catch (err: any) {
    console.error("[Platform Task Context] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
