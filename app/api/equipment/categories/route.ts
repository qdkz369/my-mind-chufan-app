import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

/**
 * GET: 获取设备分类列表
 */
export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { data: categories, error } = await supabase
      .from("equipment_categories")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) {
      console.error("[设备分类API] 查询失败:", error)
      return NextResponse.json(
        { error: "获取设备分类失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
    })
  } catch (err: any) {
    console.error("[设备分类API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

