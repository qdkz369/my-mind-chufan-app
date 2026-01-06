import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

/**
 * GET: 获取设备列表
 * 查询参数：
 * - category_id: 分类ID筛选（可选）
 * - status: 状态筛选（active, inactive, maintenance）- 可选
 * - search: 搜索关键词（可选）
 */
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category_id")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    let query = supabase
      .from("equipment")
      .select(`
        *,
        equipment_categories (
          id,
          name,
          icon,
          description
        )
      `)

    // 分类筛选
    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    // 状态筛选
    if (status) {
      query = query.eq("status", status)
    } else {
      // 默认只显示活跃的设备
      query = query.eq("status", "active")
    }

    // 搜索关键词
    if (search) {
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%`)
    }

    query = query.order("created_at", { ascending: false })

    const { data: equipment, error } = await query

    if (error) {
      console.error("[设备列表API] 查询失败:", error)
      return NextResponse.json(
        { error: "获取设备列表失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: equipment || [],
    })
  } catch (err: any) {
    console.error("[设备列表API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

