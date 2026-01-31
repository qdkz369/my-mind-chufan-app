/**
 * GET /api/platform/dispatch/recommend?task_id=xxx&task_type=delivery|repair
 * Phase B: 获取平台推荐工人（不执行分配，供前端展示）
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { dispatchMatch } from "@/lib/platform/impl/dispatch-match"
import { strategyEvaluate } from "@/lib/platform/impl/strategy-evaluate"

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
    const taskId = searchParams.get("task_id")
    const taskType = (searchParams.get("task_type") || "repair") as "delivery" | "repair"

    if (!taskId) {
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
      task_id: taskId,
      company_id: companyId,
      task_type: taskType,
      supabase,
    })

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommended_worker_id: null,
          recommended_worker_name: null,
          reason: "无可用候选工人",
          candidates: [],
        },
      })
    }

    const workersContext = candidates.map((c) => ({ id: c.worker_id, worker_id: c.worker_id }))
    const scores = strategyEvaluate({
      task_context: { task_id: taskId, task_type: taskType },
      workers_context: workersContext,
      model_version: "1.0.0",
    })

    const sorted = [...scores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const top = sorted[0]
    const recommendedWorkerId = top?.worker_id ?? candidates[0]?.worker_id
    const topCandidate = candidates.find((c) => c.worker_id === recommendedWorkerId) as
      | { primary_reason?: string; secondary_factors?: string[] }
      | undefined
    const factors = (top as { factors?: { primary_reason?: string; secondary_factors?: string[]; confidence_score?: number } })?.factors
    const platform_recommendation = {
      primary_reason: factors?.primary_reason ?? topCandidate?.primary_reason ?? "SKILL_MATCH",
      secondary_factors: factors?.secondary_factors ?? topCandidate?.secondary_factors ?? ["AVAILABILITY"],
      confidence_score: factors?.confidence_score ?? 0.8,
    }

    let recommendedWorkerName: string | null = null
    if (recommendedWorkerId) {
      const { data: worker } = await supabase
        .from("workers")
        .select("name")
        .eq("id", recommendedWorkerId)
        .maybeSingle()
      recommendedWorkerName = (worker as { name?: string } | null)?.name ?? null
    }

    const takeoverMode = (process.env.PLATFORM_DISPATCH_TAKEOVER_MODE || "shadow").toLowerCase()

    const { formatRecommendationForUI } = await import("@/lib/platform/types/recommendation")
    const reason = formatRecommendationForUI(platform_recommendation)

    return NextResponse.json({
      success: true,
      data: {
        recommended_worker_id: recommendedWorkerId,
        recommended_worker_name: recommendedWorkerName,
        reason,
        platform_recommendation,
        takeover_mode: takeoverMode === "suggest" ? "suggest" : takeoverMode === "enforced" ? "enforced" : "shadow",
        candidates: candidates.map((c) => ({
          worker_id: c.worker_id,
          score: scores.find((s) => s.worker_id === c.worker_id)?.score ?? 1,
          reason: c.reason,
        })),
      },
    })
  } catch (err: unknown) {
    console.error("[Platform Recommend] 错误:", err)
    return NextResponse.json(
      { success: false, error: "服务器错误", details: (err as Error).message },
      { status: 500 }
    )
  }
}
