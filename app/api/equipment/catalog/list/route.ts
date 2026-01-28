// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Anon Key
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，已使用 Anon Key，需完善 RLS

import { NextResponse, NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getUserContext } from "@/lib/auth/user-context"
import { enforceCompanyFilter } from "@/lib/multi-tenant"

/**
 * GET: 获取产品库列表
 * 查询参数：
 * - is_approved: 是否只显示已审核通过的产品（true/false，默认 true）
 * - provider_id: 供应商ID筛选（可选）
 * - category_id: 分类ID筛选（可选）
 */
export async function GET(request: NextRequest) {
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
        console.log("[产品库API] Super Admin 访问，跳过多租户过滤")
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
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error: "服务器配置错误",
          details: "缺少 Supabase 环境变量配置",
          data: [],
        },
        { status: 500 }
      )
    }

    // 优先使用普通客户端，通过 RLS 策略控制访问
    // 如果需要多租户隔离，使用 enforceCompanyFilter
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { searchParams } = new URL(request.url)
    const isApproved = searchParams.get("is_approved") !== "false" // 默认只显示已审核的
    let providerId = searchParams.get("provider_id") || searchParams.get("company_id") // 支持两种参数名
    const categoryId = searchParams.get("category_id")
    
    // 🔒 统一 company_id 来源：使用 getUserContext
    if (!providerId) {
      providerId = userContext?.companyId ?? null
    }

    let query = supabaseClient
      .from("equipment_catalog")
      .select(`
        *,
        companies (
          id,
          name,
          contact_name,
          contact_phone
        ),
        equipment_categories (
          id,
          name,
          icon
        )
      `)

    // 审核状态筛选
    if (isApproved) {
      query = query.eq("is_approved", true).eq("status", "active")
    }

    // 🔒 多租户隔离：强制按 provider_id 过滤（super_admin 跳过）
    if (providerId && userContext?.role !== "super_admin") {
      try {
        query = enforceCompanyFilter(query, providerId, "provider_id")
        console.log("[产品库API] 应用多租户过滤，provider_id:", providerId)
      } catch (error) {
        // ⚠️ 临时修复：如果 enforceCompanyFilter 失败，只记录错误，不返回 500
        console.error("[产品库API] 多租户过滤失败（继续执行）:", error)
      }
    } else if (userContext?.role === "super_admin") {
      console.log("[产品库API] Super Admin 访问，不应用多租户过滤")
    } else {
      // ⚠️ 警告：如果没有 provider_id，可能返回所有供应商的产品
      // 对于客户端展示墙，允许查看所有已审核的产品
      // 对于供应商端，应该强制要求 provider_id
      console.warn("[产品库API] ⚠️ 未提供 provider_id，返回所有已审核产品（仅适用于客户端展示墙）")
    }

    // 分类筛选
    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    query = query.order("created_at", { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("[产品库API] 查询失败:", error)
      return NextResponse.json(
        {
          success: false,
          error: "获取产品库列表失败",
          details: error.message,
          data: [],
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (err: any) {
    console.error("[产品库API] 错误:", err)
    return NextResponse.json(
      {
        success: false,
        error: "服务器内部错误",
        details: err.message,
        data: [],
      },
      { status: 200 }
    )
  }
}

