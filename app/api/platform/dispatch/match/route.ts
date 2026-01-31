/**
 * Platform Capability API: Dispatch Match
 * POST /api/platform/dispatch/match
 * 匹配工人：输入任务与约束，输出候选工人列表
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { dispatchMatch } from "@/lib/platform/impl"

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
    const { task_id, strategy_id, constraints, context, task_type } = body

    if (!task_id) {
      return NextResponse.json(
        { success: false, error: "缺少 task_id" },
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

    const candidates = await dispatchMatch({
      task_id,
      company_id: companyId,
      task_type,
      supabase,
    })

    return NextResponse.json({
      success: true,
      data: { candidates },
    })
  } catch (err: any) {
    console.error("[Platform Dispatch Match] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
