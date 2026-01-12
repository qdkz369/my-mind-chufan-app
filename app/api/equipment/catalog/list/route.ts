// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Anon Key
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，已使用 Anon Key，需完善 RLS

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getCurrentCompanyId, enforceCompanyFilter } from "@/lib/multi-tenant"

/**
 * GET: 获取产品库列表
 * 查询参数：
 * - is_approved: 是否只显示已审核通过的产品（true/false，默认 true）
 * - provider_id: 供应商ID筛选（可选）
 * - category_id: 分类ID筛选（可选）
 */
export async function GET(request: Request) {
  try {
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
    
    // 🔒 多租户隔离：尝试从当前用户获取 company_id
    if (!providerId) {
      try {
        providerId = await getCurrentCompanyId(request)
      } catch (error) {
        console.warn("[产品库API] 无法获取当前用户的 company_id:", error)
      }
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

    // 🔒 多租户隔离：强制按 provider_id 过滤
    // 如果提供了 provider_id，使用 enforceCompanyFilter 确保隔离
    if (providerId) {
      try {
        query = enforceCompanyFilter(query, providerId, "provider_id")
        console.log("[产品库API] 应用多租户过滤，provider_id:", providerId)
      } catch (error) {
        console.error("[产品库API] 多租户过滤失败:", error)
        return NextResponse.json(
          {
            success: false,
            error: "多租户隔离失败",
            details: error instanceof Error ? error.message : "未知错误",
            data: [],
          },
          { status: 500 }
        )
      }
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

