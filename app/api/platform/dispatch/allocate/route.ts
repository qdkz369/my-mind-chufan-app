/**
 * Platform Capability API: Dispatch Allocate
 * POST /api/platform/dispatch/allocate
 * 分配任务：将任务分配给指定工人
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { dispatchAllocate } from "@/lib/platform/impl"

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
    const { task_id, worker_id, decision_trace, task_type } = body

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
      userContext.role !== "super_admin" ? userContext.companyId ?? null : null
    if (userContext.role !== "super_admin" && !companyId) {
      return NextResponse.json(
        { success: false, error: "权限不足", details: "用户未关联公司" },
        { status: 403 }
      )
    }

    const result = await dispatchAllocate({
      task_id,
      worker_id,
      company_id: companyId,
      actor_id: userContext.userId,
      decision_trace,
      task_type,
      supabase,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "分配失败" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { allocated: true, table: result.table },
    })
  } catch (err: any) {
    console.error("[Platform Dispatch Allocate] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
