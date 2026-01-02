import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

/**
 * GET: 检查 workers 表是否存在
 */
export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    // 尝试查询表
    const { data, error } = await supabase
      .from("workers")
      .select("id")
      .limit(1)

    if (error) {
      if (error.message?.includes("schema cache") || error.message?.includes("not found")) {
        return NextResponse.json({
          exists: false,
          error: "workers 表不存在",
          message: "请在 Supabase Dashboard 的 SQL Editor 中执行 CREATE_WORKERS_TABLE_SIMPLE.sql 脚本",
        })
      }
      return NextResponse.json({
        exists: false,
        error: error.message || "未知错误",
      })
    }

    return NextResponse.json({
      exists: true,
      message: "workers 表存在",
    })
  } catch (error) {
    console.error("[检查表] 处理请求时出错:", error)
    return NextResponse.json(
      {
        exists: false,
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

