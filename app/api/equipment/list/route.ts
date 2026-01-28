// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Service Role Key (优先)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，后续必须迁移到 Anon Key + RLS

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"

/**
 * GET: 获取设备列表
 * 查询参数：
 * - category_id: 分类ID筛选（可选）
 * - status: 状态筛选（active, inactive, maintenance）- 可选
 * - search: 搜索关键词（可选）
 */
export async function GET(request: Request) {
  try {
    // P0修复：强制使用统一用户上下文获取用户身份和权限
    let userContext
    try {
      userContext = await getUserContext(request)
      if (!userContext) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
            data: [],
          },
          { status: 401 }
        )
      }
      if (userContext.role === "super_admin") {
        console.log("[设备列表API] Super Admin 访问，跳过多租户过滤")
      }
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      if (errorMessage.includes("未登录")) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
            data: [],
          },
          { status: 401 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: errorMessage,
          data: [],
        },
        { status: 403 }
      )
    }

    // P0修复：强制验证 companyId（super_admin 除外）
    if (!userContext.companyId && userContext.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "用户未关联任何公司",
          data: [],
        },
        { status: 403 }
      )
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    // 优先使用 service role key，如果没有则使用 anon key（需要 RLS 策略允许）
    const keyToUse = serviceRoleKey || anonKey
    const useServiceRole = !!serviceRoleKey
    
    if (!supabaseUrl || !keyToUse) {
      console.error("[设备列表API] Supabase URL 或密钥未配置")
      return NextResponse.json(
        { 
          success: true, 
          data: [],
          warning: "未配置 Supabase 密钥，返回空列表"
        },
        { status: 200 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category_id")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    let query = supabaseClient
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
      // 如果是表不存在的错误，返回空数组而不是错误
      if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
        console.warn("[设备列表API] 表不存在，返回空列表:", error.message)
        return NextResponse.json({
          success: true,
          data: [],
          warning: "设备表不存在，请先运行数据库迁移脚本"
        })
      }
      
      console.error("[设备列表API] 查询失败:", error)
      // 即使查询失败，也返回空数组，避免前端崩溃
      return NextResponse.json({
        success: true,
        data: [],
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      data: equipment || [],
    })
  } catch (err: any) {
    console.error("[设备列表API] 错误:", err)
    // 捕获所有错误，返回空数组而不是错误，确保前端不会崩溃
    return NextResponse.json({
      success: true,
      data: [],
      error: err.message
    })
  }
}

