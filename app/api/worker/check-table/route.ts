import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

/**
 * GET: 检查 workers 表是否存在
 */
export async function GET() {
  try {
    if (!supabase) {
      console.error("[检查表] Supabase 客户端未初始化")
      return NextResponse.json(
        { error: "数据库连接失败", exists: false },
        { status: 500 }
      )
    }

    console.log("[检查表] 开始检查 workers 表是否存在...")
    
    // 尝试查询表
    const { data, error } = await supabase
      .from("workers")
      .select("id")
      .limit(1)

    if (error) {
      console.error("[检查表] 查询失败:", error.message, "错误代码:", error.code)
      if (error.message?.includes("schema cache") || error.message?.includes("not found") || error.code === "42P01") {
        return NextResponse.json({
          exists: false,
          error: "workers 表不存在",
          message: "请在 Supabase Dashboard 的 SQL Editor 中执行 CREATE_WORKERS_TABLE_FINAL.sql 脚本",
        })
      }
      return NextResponse.json({
        exists: false,
        error: error.message || "未知错误",
        code: error.code,
      })
    }

    console.log("[检查表] workers 表存在，查询成功")
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

