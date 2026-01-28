/**
 * 溯源查询 API
 * 阶段 2B-3.5：资产溯源地基扩展
 * 
 * GET /api/trace/query/:asset_id
 * 用途：查询指定资产的完整溯源记录
 * 预留接口：不实现完整业务，仅创建基础路由与最小可运行结构
 */

import { NextResponse, NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ asset_id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    // Next.js 16: params 现在是 Promise，需要 await
    const { asset_id } = await params

    if (!asset_id) {
      return NextResponse.json(
        { error: "缺少必要参数: asset_id" },
        { status: 400 }
      )
    }

    // 预留接口：查询 trace_logs 或返回空数组即可
    // 当前不强制校验，仅为未来扩展预留
    const { data, error } = await supabase
      .from("trace_logs")
      .select("id, asset_id, operator_id, action_type, order_id, created_at")
      .eq("asset_id", asset_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[溯源查询API] 查询失败:", error)
      // 查询失败时返回空数组，不阻断流程
      return NextResponse.json({
        success: true,
        message: "溯源查询接口（预留）",
        data: [],
      })
    }

    return NextResponse.json({
      success: true,
      message: "溯源查询成功",
      data: data || [],
    })
  } catch (error) {
    console.error("[溯源查询API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
