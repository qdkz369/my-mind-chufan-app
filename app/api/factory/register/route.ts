/**
 * 出厂登记 API
 * 阶段 2B-3.5：资产溯源地基扩展
 * 
 * POST /api/factory/register
 * 用途：工厂登记气瓶资产到 gas_cylinders 表
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
    const { asset_id, manufacturer_id, production_date, status } = body

    // 预留接口：允许写入 gas_cylinders 或返回空数组即可
    // 当前不强制校验，仅为未来扩展预留
    if (asset_id) {
      const { data, error } = await supabase
        .from("gas_cylinders")
        .insert([
          {
            id: asset_id,
            manufacturer_id: manufacturer_id || null,
            status: status || null,
            production_date: production_date || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("[出厂登记API] 写入失败:", error)
        return NextResponse.json(
          {
            error: "出厂登记失败",
            details: error.message,
          },
          { status: 500 }
        )
      }

      // 可选：写入 trace_logs（出厂操作）
      if (data) {
        const { error: traceError } = await supabase
          .from("trace_logs")
          .insert([
            {
              asset_id: asset_id,
              operator_id: manufacturer_id || null,
              action_type: "出厂",
              order_id: null,
              created_at: new Date().toISOString(),
            },
          ])

        if (traceError) {
          console.error("[出厂登记API] 写入溯源记录失败:", traceError)
          // 溯源记录写入失败不影响主流程
        }
      }

      return NextResponse.json({
        success: true,
        message: "出厂登记成功",
        data: data || {},
      })
    }

    // 如果没有 asset_id，返回空数据
    return NextResponse.json({
      success: true,
      message: "出厂登记接口（预留）",
      data: [],
    })
  } catch (error) {
    console.error("[出厂登记API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}
