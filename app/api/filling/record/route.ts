/**
 * 充装记录 API
 * 阶段 2B-3.5：资产溯源地基扩展
 * 
 * POST /api/filling/record
 * 用途：记录充装操作到 trace_logs 表
 * 预留接口：不实现完整业务，仅创建基础路由与最小可运行结构
 */

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { asset_id, operator_id, order_id } = body

    // 预留接口：允许写入 trace_logs 或返回空数组即可
    // 当前不强制校验，仅为未来扩展预留
    if (asset_id) {
      const { data, error } = await supabase
        .from("trace_logs")
        .insert([
          {
            asset_id: asset_id,
            operator_id: operator_id || null,
            action_type: "充装",
            order_id: order_id || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("[充装记录API] 写入失败:", error)
        return NextResponse.json(
          {
            error: "充装记录失败",
            details: error.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "充装记录成功",
        data: data || {},
      })
    }

    // 如果没有 asset_id，返回空数据
    return NextResponse.json({
      success: true,
      message: "充装记录接口（预留）",
      data: [],
    })
  } catch (error) {
    console.error("[充装记录API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
