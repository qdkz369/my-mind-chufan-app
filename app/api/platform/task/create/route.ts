/**
 * Platform Capability API: Task Create
 * POST /api/platform/task/create
 * 创建任务（当前为占位实现）
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
    const { context, type } = body

    if (!context || typeof context !== "object") {
      return NextResponse.json(
        { success: false, error: "缺少 context" },
        { status: 400 }
      )
    }

    // 占位实现：返回虚拟 task_id
    return NextResponse.json({
      success: true,
      data: { task_id: `placeholder-${Date.now()}` },
      _placeholder: true,
    })
  } catch (err: any) {
    console.error("[Platform Task Create] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
